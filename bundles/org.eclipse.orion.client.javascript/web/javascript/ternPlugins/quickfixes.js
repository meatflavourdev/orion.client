/*******************************************************************************
 * @license
 * Copyright (c) 2016 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd*/
define([
	"javascript/finder",
	"tern/lib/tern"
], function(Finder, tern) {

	tern.registerPlugin("quickfixes", /* @callback */ function(server, options) { //$NON-NLS-1$
		return {
     		//no pass hooks needed
    	};
	});
	
	tern.defineQueryType("fixes", { //$NON-NLS-1$
		takesFile: true,
		/**
		 * @callback
		 */
		run: function(server, query, file) {
			return computeFixes(query, file);
		}
	});
	
	var availableFixes = {
		/**
		 * @description Fix for 'radix' problem
		 * @function
		 * @callback
		 */
		"radix": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot) {
				var node = Finder.findNode(annot.start, file.ast, {parents:true});
				if(node && node.type === 'Identifier') {
					node = node.parents[node.parents.length-1];
					if(node.type === 'CallExpression' && Array.isArray(node.arguments)) {
						var arg = node.arguments[node.arguments.length-1];
						return {text: ", 10", start: arg.range[1], end: arg.range[1]}; //$NON-NLS-1$
					}
				}
			});
		},
		/**
		 * @description Fix for 'curly' problem
		 * @function
		 * @callback
		 */
		"curly": function(annotation, annotations, file) {
			var tok = Finder.findToken(annotation.start, file.ast.tokens);
			if(tok) {
				tok = file.ast.tokens[tok.index-1];
				var idx = tok.range[1],
					start = tok.range[1],
					end = annotation.end,
					lineBreak = false;
				while(idx < annotation.start) {
					if(file.ast.sourceFile.text.charAt(idx) === '\n') {
						lineBreak = true;
						break;
					}
					idx++;
				}
				var text = ' {'+ file.ast.sourceFile.text.slice(start, end); //$NON-NLS-1$
				if(lineBreak) {
					var node = Finder.findNode(annotation.start, file.ast, {parents: true});
					if(node) {
						var p = node.parents[node.parents.length-1];
						var lineStart = getLineStart(file.ast.sourceFile.text, p.range[0]);
						var ctrl = getControlStatementParent(node);
						if(ctrl) {
							//compute the offset based on the control statement start if we can
							lineStart = getLineStart(file.ast.sourceFile.text, ctrl.range[0]);
						}
						//only preserve comments and whitespace at the end of the line
						//erroneous statements should not be enclosed
						var lineEnd = getLineEnd(file.ast.sourceFile.text, end);
						var preserved = '';
						var nodes = Finder.findNodesForRange(file.ast, end, lineEnd);
						if(lineEnd > end && nodes.length < 1) {
							preserved += file.ast.sourceFile.text.slice(end, lineEnd);
							end = lineEnd;
						}
						text += preserved+'\n'+computeIndent(file.ast.sourceFile.text, lineStart, 0)+'}'; //$NON-NLS-1$
					}
				} else {
					text += ' }'; //$NON-NLS-1$
				}
				return {text: text, start: start, end: end};
			}
		},
		/**
		 * @description Fix for 'no-new-wrappers' problem
		 * @function
		 * @callback
		 */
		"no-new-wrappers": function(annotation, annotations, file) {
			var node = Finder.findNode(annotation.start, file.ast, {parents:true});
			if(node) {
				var parent = node.parents[node.parents.length-1];
				if(parent.type === 'NewExpression') {
					var tok = Finder.findToken(parent.range[0], file.ast.tokens);
					if(tok && tok.type === 'Keyword' && tok.value === 'new') {
						var text = '';
						var end = tok.range[1],
							start = tok.range[0],
							prev = file.ast.tokens[tok.index-1];
						if(prev.range[1] < tok.range[0]) {
							end = node.range[0];
							start = prev.range[1]+1;
						} else if(node.range[0] - end > 1) {
							end += node.range[0] - end - 1;
						}
						if(parent.callee.name === 'Math' || parent.callee.name === 'JSON') {
							//also get rid of the params - these two have no functional equivilent
							end = parent.range[1];
							text = parent.callee.name;
						}
						return {text: text, start: start, end: end};
					}
				}
			}
		},
		/**
		 * @description Fix for 'no-new-wrappers-literal' problem
		 * @function
		 * @callback
		 */
		"no-new-wrappers-literal": function(annotation, annotations, file) {
			var node = Finder.findNode(annotation.start, file.ast, {parents:true});
			if(node) {
				var parent = node.parents[node.parents.length-1];
				if(parent.type === 'NewExpression') {
					switch(parent.callee.name) {
						case 'Math':
						case 'JSON': {
							return {text: parent.callee.name, start: parent.range[0], end: parent.range[1]};
						}
						case 'String': {
							var s = '';
							if(parent.arguments.length > 0) {
								var str = parent.arguments[0];
								if(str.type === 'Literal') {
									s = String(str.value);	
								} else if(str.type === 'Identifier') {
									if(str.name === 'undefined') {
										s = String(undefined);
									} else if(str.name === 'NaN') {
										s = String(NaN);
									} else {
										s = String(str.name);
									}
								}
							} else {
								s = String();
							}
							return {text: '"'+s.toString()+'"', start: parent.range[0], end: parent.range[1]}; //$NON-NLS-1$ //$NON-NLS-2$
						}
						case 'Number': {
							var nu;
							if(parent.arguments.length > 0) {
								var num = parent.arguments[0];
								if(num.type === 'Literal') {
									nu = Number(num.value);
								} else if(num.type === 'Identifier') {
									if(num.name === 'undefined') {
										nu = Number(undefined);
									} else if(num.name === 'NaN') {
										nu = Number(NaN);
									} else {
										nu = Number(num.name);
									}
								} else {
									nu = Number(num);
								}
							} else {
								nu = Number();
							}
							return {text: nu.toString(), start: parent.range[0], end: parent.range[1]};
						}
						case 'Boolean': {
							var b;
							if(parent.arguments.length > 0) {
								var arg = parent.arguments[0];
								if(arg.type === 'ObjectExpression') {
									b = true;
								} else if(arg.type === 'Literal') {
									b = Boolean(arg.value);
								} else if(arg.type === 'Identifier') {
									if(arg.name === 'undefined') {
										b = Boolean(undefined);
									} else if(arg.name === 'NaN') {
										b = Boolean(NaN);
									} else {
										b = Boolean(arg.name);
									}
								} else if(arg.type === 'UnaryExpression' && arg.operator === '-' && 
									arg.argument.type === 'Literal' && typeof arg.argument.value === 'number') {
									b = false;
								}
							} else {
								b = false;
							}
							return {text: b.toString(), start: parent.range[0], end: parent.range[1]};
						}
					}
				}
			}
		},
		/**
		 * @description Fix for 'no-debugger' problem
		 * @function
		 * @callback
		 */
		"no-debugger" : function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot) {
				var end = annot.end;
				var tok = Finder.findToken(annot.end, file.ast.tokens);
				if(tok && tok.type === 'Punctuator' && tok.value === ';') {
					end = tok.range[1];
				} 
				return {text: '', start: annot.start, end: end};
			});
		},
		/**
		 * @description Fix for 'eqeqeq' problem
		 * @function
		 * @callback
		 */
		"eqeqeq": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot){
				var expected = /^.*\'(\!==|===)\'/.exec(annot.title);
				return {text: expected[1],	start: annot.start,	end: annot.end};
			});
		},
		/**
		 * @description Fix for 'no-eq-null' problem
		 * @function
		 * @callback
		 */
		"no-eq-null": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot){
				var expected = /^.*\'(\!==|===)\'/.exec(annot.title);
				return {text: expected[1], start: annot.start,	end: annot.end};
			});
		},
		/**
		 * @description Fix for 'no-undef-init' problem
		 * @function
		 * @callback
		 */
		"no-undef-init": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot){
				var node = Finder.findNode(annot.start, file.ast, {parents:true});
				if(node) {
					var p = node.parents[node.parents.length-1];
					if(p.type === 'VariableDeclarator') {
						return {text: '', start: p.id.range[1], end: p.range[1]};									
					}
				}
			});
		},
		/**
		 * @description Fix for 'no-self-assign' problem
		 * @function
		 * @callback
		 */
		"no-self-assign": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot) {
				var node = Finder.findNode(annot.start, file.ast, {parents:true});
				if(node) {
					var p = node.parents[node.parents.length-1];
					if(p.type === 'AssignmentExpression') {
						var end = p.range[1];
						var tok = Finder.findToken(end, file.ast.tokens);
						if(tok) {
							//we want the next one, ignoring whitespace
							tok = file.ast.tokens[tok.index+1];
							if(tok &&  tok.type === 'Punctuator' && tok.value === ';') {
								end = tok.range[1]; //clean up trailing semicolons
							}
						}
						return {text: '', start: p.range[0], end: end};
					}
				}
			});
		},
		/**
		 * @description Fix for 'new-parens' problem
		 * @function
		 * @callback
		 */
		"new-parens": function(annotation, annotations, file) {
			var node = Finder.findNode(annotation.start, file.ast, {parents:true});
			if(node && node.type === 'Identifier') {
				return {text: '()', start: node.range[1], end: node.range[1]}; //$NON-NLS-1$
			}
		},
		/** 
		 * @description fix for the missing-nls rule
		 * @function 
		 * @callback
		 */
        "missing-nls": function(annotation, annotations, file){
    		return applySingleFixToAll(annotations, function(annot) {
                if(annot.data && typeof annot.data.indexOnLine === 'number') {
	                // Insert the correct non nls comment
	                var end = getLineEnd(file.ast.sourceFile.text, annot.end);
	                // indexOnLine starts at 0, non-nls comments start at one
	                var comment = " //$NON-NLS-" + (annot.data.indexOnLine + 1) + "$"; //$NON-NLS-1$
	                return {text: comment,	start: end, end: end};
                }
            });
        },
		/** 
		 * @description fix for the 'no-comma-dangle' rule
		 * @function 
		 * @callback
		 */
		"no-comma-dangle": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot){
				return {text: '', start: annot.start, end: annot.end};
			});
		},
		/** 
		 * @description fix for the 'no-comma-dangle' rule
		 * @function 
		 * @callback
		 */
		"no-empty-block": function(annotation, annotations, file) {
            var linestart = getLineStart(file.ast.sourceFile.text, annotation.start);
            var fix = '//TODO empty block'; //$NON-NLS-1$
            var indent = computeIndent(file.ast.sourceFile.text, linestart, true);
            fix = '\n' + indent + fix; //$NON-NLS-1$
            fix += computePostfix(file.ast.sourceFile.text, annotation);
            return {text: fix, start: annotation.start+1, end: annotation.start+1};
        },
		/** 
		 * @description fix for the 'no-extra-parens' rule
		 * @function 
		 * @callback
		 */
		"no-extra-parens": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(annot) {
				var token = Finder.findToken(annot.start, file.ast.tokens);
				var openBracket = file.ast.tokens[token.index-1];
				if (openBracket.value === '(') {
					var closeBracket = Finder.findToken(annot.end, file.ast.tokens);
					if (closeBracket.value === ')') {
						var replacementText = "";
						if (token.index >= 2) {
							var previousToken = file.ast.tokens[token.index - 2];
							if (previousToken.range[1] === openBracket.range[0]
									&& (previousToken.type === "Identifier" || previousToken.type === "Keyword")) {
								// now we should also check if there is a space between the '(' and the next token
								if (token.range[0] === openBracket.range[1]) {
									replacementText = " "; //$NON-NLS-1$
								}
							}
						}
						return [
							{text: replacementText, start: openBracket.range[0], end: openBracket.range[1]},
							{text: '', start: closeBracket.range[0], end: closeBracket.range[1]}
						];
					}
				}
			});
		},
		/** 
		 * @description fix for the 'no-extra-semi' rule
		 * @function 
		 * @callback
		 */
		"no-extra-semi": function(annotation, annotations, file) {
			return applySingleFixToAll(annotations, function(currentAnnotation){
	           return {text: '', start: currentAnnotation.start, end: currentAnnotation.end};
            });
        },
        /** 
		 * @description fix for the 'no-fallthrough' rule
		 * @function 
		 * @callback
		 */
        "no-fallthrough": function(annotation, annotations, file) {
            var linestart = getLineStart(file.ast.sourceFile.text, annotation.start);
            var fix = '//$FALLTHROUGH$'; //$NON-NLS-1$
            var indent = computeIndent(file.ast.sourceFile.text, linestart);
            fix += computePostfix(file.ast.sourceFile.text, annotation, indent);
            return {text: fix, start: annotation.start, end: annotation.start};
        },
        /** 
		 * @description fix for the 'no-fallthrough-break' rule
		 * @function 
		 * @callback
		 */
        "no-fallthrough-break": function(annotation, annotations, file) {
            var linestart = getLineStart(file.ast.sourceFile.text, annotation.start);
            var fix = 'break;'; //$NON-NLS-1$
            var indent = computeIndent(file.ast.sourceFile.text, linestart);
            fix += computePostfix(file.ast.sourceFile.text, annotation, indent);
            return {text: fix, start: annotation.start, end: annotation.start};
        },
        /** 
		 * @description fix for the 'no-new-array' rule
		 * @function 
		 * @callback
		 */
        "no-new-array": function(annotation, annotations, file) {
   			var node = Finder.findNode(annotation.start, file.ast, {parents:true});
   			if(node && node.parents) {
   				var p = node.parents[node.parents.length-1];
   				if(p.type === 'CallExpression' || p.type === 'NewExpression') {
   					var fix = '';
   					if(p.arguments.length > 0) {
   						var start = p.arguments[0].range[0], end = p.arguments[p.arguments.length-1].range[1];
   						fix += '[' + file.ast.sourceFile.text.substring(start, end) + ']';
   					} else {
   						fix += '[]'; //$NON-NLS-1$
   					}
   					return {text: fix, start: p.start, end: p.end};
   				}
   			}
        },
        /** 
		 * @description fix for the 'no-reserved-keys' rule
		 * @function 
		 * @callback
		 */
       "no-reserved-keys": function(annotation, annotations, file) {
   			return applySingleFixToAll(annotations, function(annot) {
   				var node = Finder.findNode(annot.start, file.ast, {parents:true});
                if(node && node.type === 'Identifier') {
	                return {text: '"'+node.name+'"', start: node.range[0], end: node.range[1]}; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-2$
				}
   			});
        },
        /** 
		 * @description fix for the 'no-throw-literal' rule
		 * @function 
		 * @callback
		 */
        "no-throw-literal": function(annotation, annotations, file) {
            var node = Finder.findNode(annotation.start, file.ast, {parents:true});
            var source = node.raw || file.ast.sourceFile.text.slice(node.range[0], node.range[1]);
            return {text: 'new Error(' + source + ')', start: annotation.start, end: annotation.end}; //$NON-NLS-1$
        },
        /** 
		 * @description fix for the 'no-undef-defined' rule
		 * @function 
		 * @callback
		 */
        "no-undef-defined": function(annotation, annotations, file) {
            /**
             * @callback
             */
            function assignLike(node) {
                if(node && node.parents && node.parents.length > 0 && node.type === 'Identifier') {
                    var parent = node.parents.pop();
                    return parent && (parent.type === 'AssignmentExpression' || parent.type === 'UpdateExpression'); 
                }
                return false;
            }
            var name = /^'(.*)'/.exec(annotation.title);
            if(name !== null && typeof name !== 'undefined') {
                var comment = null;
                var start = 0;
                var insert = name[1];
                var node = Finder.findNode(annotation.start, file.ast, {parents:true});
                if(assignLike(node)) {
                    insert += ':true'; //$NON-NLS-1$
                }
                comment = Finder.findDirective(file.ast, 'globals'); //$NON-NLS-1$
                if(comment) {
                    start = comment.range[0]+2;
                    return {text: updateDirective(comment.value, 'globals', insert), start: start, end: start+comment.value.length}; //$NON-NLS-1$
                }
                var point = getDirectiveInsertionPoint(file.ast);
            	var linestart = getLineStart(file.ast.sourceFile.text, point);
            	var indent = computeIndent(file.ast.sourceFile.text, linestart, false);
       			var fix = '/*globals '+insert+' */\n' + indent; //$NON-NLS-1$ //$NON-NLS-2$
                return {text: fix, start: point, end: point};
            }
        },
        /** 
		 * @description fix for the 'no-undef-defined-inenv' rule
		 * @function 
		 * @callback
		 */
        "no-undef-defined-inenv": function(annotation, annotations, file) {
            var name = /^'(.*)'/.exec(annotation.title);
            if(name !== null && typeof name !== 'undefined') {
                var comment = null;
                var start = 0;
                if(name[1] === 'console') {
                    var env = 'node'; //$NON-NLS-1$
                } else {
                    env = Finder.findESLintEnvForMember(name[1]);
                }
                if(env) {
                    comment = Finder.findDirective(file.ast, 'eslint-env'); //$NON-NLS-1$
                    if(comment) {
                        start = getDocOffset(file.ast.sourceFile.text, comment.range[0]) + comment.range[0];
	                    return {text: updateDirective(comment.value, 'eslint-env', env, true), start: start, end: start+comment.value.length}; //$NON-NLS-1$
                    }
                    var point = getDirectiveInsertionPoint(file.ast);
            		var linestart = getLineStart(file.ast.sourceFile.text, point);
            		var indent = computeIndent(file.ast.sourceFile.text, linestart, false);
       				var fix = '/*eslint-env '+env+' */\n' + indent; //$NON-NLS-1$ //$NON-NLS-2$
                    return {text: fix, start: point, end: point};
                }
            }
        },
        /** 
		 * @description fix for the 'no-unreachable' rule
		 * @function 
		 * @callback
		 */
		"no-unreachable": function(annotation, annotations, file) {
            return {text: '', start: annotation.start, end: annotation.end};    
        },
        /** 
		 * @description fix for the 'no-unused-params' rule
		 * @function 
		 * @callback
		 */
        "no-unused-params": function(annotation, annotations, file) {
        	return applySingleFixToAll(annotations, function(annot){
                var node = Finder.findNode(annot.start, file.ast, {parents:true});
                if(node) {
                    var changes = [];
                    var parent = node.parents.pop();
                    var paramindex = -1;
                    for(var i = 0; i < parent.params.length; i++) {
                        var p = parent.params[i];
                        if(node.range[0] === p.range[0] && node.range[1] === p.range[1]) {
                            paramindex = i;
                            break;
                        }
                    }
                    var change = removeIndexedItemChange(parent.params, paramindex);
                    if(change) {
                        changes.push(change);
                    }
                    switch(parent.type) {
                        case 'FunctionExpression': {
                            var funcparent = node.parents.pop();
                            if(funcparent.type === 'CallExpression' && (funcparent.callee.name === 'define' || funcparent.callee.name === 'require')) {
                                var args = funcparent.arguments;
                                for(i = 0; i < args.length; i++) {
                                    var arg = args[i];
                                    if(arg.type === 'ArrayExpression') {
                                        change = removeIndexedItemChange(arg.elements, paramindex);
                                        if(change) {
                                            changes.push(change);
                                        }
                                        break;
                                    }
                                }
                            } else if(funcparent.type === 'Property' && funcparent.key.leadingComments && funcparent.key.leadingComments.length > 0) {
                                change = updateDoc(funcparent.key, file.ast.sourceFile.text, parent.params[paramindex].name);
                                if(change) {
                                    changes.push(change);
                                }
                            }
                            break;
                        }
                        case 'FunctionDeclaration': {
                           change = updateDoc(parent, file.ast.sourceFile.text, parent.params[paramindex].name);
                           if(change) {
                               changes.push(change);
                           }
                           break;
                        }
                    }
                    return changes;
                }
            });
        },
        /** 
		 * @description fix for the 'no-unused-params-expr' rule
		 * @function 
		 * @callback
		 */
        "no-unused-params-expr": function(annotation, annotations, file) {
	        	/**
	        	 * @callback 
	        	 */
	        	function updateCallback(node, ast, comments) {
	                if(Array.isArray(comments)) {
	                    //attach it to the last one
	                    var comment = comments[comments.length-1];
	                    if(comment.type === 'Block') {
	                        var valueend = comment.range[0]+comment.value.length+getDocOffset(ast.sourceFile.text, comment.range[0]);
	                        var start = getLineStart(ast.sourceFile.text, valueend);
	                        var indent = computeIndent(ast.sourceFile.text, start);
	                        var fix = "* @callback\n"+indent; //$NON-NLS-1$
	                        /*if(comment.value.charAt(valueend) !== '\n') {
	                            fix = '\n' + fix;
	                        }*/
	                        return {text: fix, start: valueend-1, end: valueend-1};
	                    }
	                }
	                start = getLineStart(ast.sourceFile.text, node.range[0]);
	                indent = computeIndent(ast.sourceFile.text, start);
	                return {text: "/**\n"+indent+" * @callback\n"+indent+" */\n"+indent, start: node.range[0], end: node.range[0]}; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
	        	}
                var node = Finder.findNode(annotation.start, file.ast, {parents:true});
                if(node && node.parents && node.parents.length > 0) {
                    var func = node.parents.pop();
                    var p = node.parents.pop();
                    var change;
                    switch(p.type) {
                    	case 'Property': {
                    		if(!hasDocTag(['@callback', '@public'], p) && !hasDocTag(['@callback', '@public'], p.key)) { //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$
                    			change = updateCallback(p, file.ast, p.leadingComments ? p.leadingComments : p.key.leadingComments);
                			}
                    		break;
                    	}
                    	case 'AssignmentExpression': {
                    		var left = p.left;
                    		if(left.type === 'MemberExpression' && !hasDocTag(['@callback', '@public'], left)) { //$NON-NLS-1$ //$NON-NLS-2$
				        		change = updateCallback(left, file.ast, left.leadingComments);
				        	} else if(left.type === 'Identifier' && !hasDocTag(['@callback', '@public'], left)) { //$NON-NLS-1$ //$NON-NLS-2$
				        		change = updateCallback(p.left, file.ast, left.leadingComments);	        		
				        	}
                			break;
                    	}
                    	case 'VariableDeclarator': {
                    		var oldp = p;
                			p = node.parents.pop();
                			if(p.declarations[0].range[0] === oldp.range[0] && p.declarations[0].range[1] === oldp.range[1]) {
                				//insert at the var keyword level to not mess up the code
                				change = updateCallback(p, file.ast, oldp.id.leadingComments);
                			} else if(!hasDocTag(['@callback', '@public'], oldp.id)) { //$NON-NLS-1$ //$NON-NLS-2$
                    			change = updateCallback(oldp, file.ast, oldp.id.leadingComments);
                			} 
                    		break;
                    	}
                    }
                    if(!change && !hasDocTag(['@callback', '@public'], func)) { //$NON-NLS-1$ //$NON-NLS-2$
                        return {text: "/* @callback */ ", start: func.range[0], end: func.range[0]}; //$NON-NLS-1$
                    }
                }
                return change;
	        },
	    /** 
		 * @description fix for the 'no-unused-vars-unused' rule
		 * @function 
		 * @callback
		 */
        "no-unused-vars-unused": function(annotation, annotations, file) {
            var node = Finder.findNode(annotation.start, file.ast, {parents:true});
            if(node && node.parents && node.parents.length > 0) {
                var declr = node.parents.pop();
                if(declr.type === 'VariableDeclarator') {
                    var decl = node.parents.pop();
                    if(decl.type === 'VariableDeclaration') {
                        if(decl.declarations.length === 1) {
                            return {text: '', start: decl.range[0], end: decl.range[1]};
                        }
                        var idx = indexOf(decl.declarations, declr);
                        if(idx > -1) {
                        	var change = removeIndexedItemChange(decl.declarations, idx);
                        	if(change) {
                        		return {text: change.text, start: change.start, end: change.end};
                        	}
                        }
                    }
                }
            }
        },
        /** 
		 * @description fix for the 'no-unused-vars-unread' rule
		 * @function 
		 * @callback
		 */
        "no-unused-vars-unread": function(annotation, annotations, file) {
            var node = Finder.findNode(annotation.start, file.ast, {parents:true});
            if(node && node.parents && node.parents.length > 0) {
                var declr = node.parents.pop();
                if(declr.type === 'VariableDeclarator') {
                    var decl = node.parents.pop();
                    if(decl.type === 'VariableDeclaration') {
                        if(decl.declarations.length === 1) {
                            return {text: '', start: decl.range[0], end: decl.range[1]};
                        }
                        var idx = indexOf(decl.declarations, declr);
                        if(idx > -1) {
                        	var change = removeIndexedItemChange(decl.declarations, idx);
                        	if(change) {
                        		return {text: change.text, start: change.start, end: change.end};
                        	}
                        }
                    }
                }
            }
        },
        /** 
		 * @description fix for the 'no-unused-vars-unused-funcdecl' rule
		 * @function 
		 * @callback
		 */
        "no-unused-vars-unused-funcdecl": function(annotation, annotations, file) {
                var node = Finder.findNode(annotation.start, file.ast, {parents:true});
                if(node && node.parents && node.parents.length > 0) {
                    var decl = node.parents.pop();
                    if(decl.type === 'FunctionDeclaration') {
                        return {text: '', start: decl.range[0], end: decl.range[1]};
                    }
                }
        },
        /** 
		 * @description fix for the 'use-isnan' rule
		 * @function 
		 * @callback
		 */
       "use-isnan": function(annotation, annotations, file) {
       		return applySingleFixToAll(annotations, function(annot){
       			var node = Finder.findNode(annot.start, file.ast, {parents:true});
                if(node && node.parents && node.parents.length > 0) {
                    var bin = node.parents.pop();
                    if(bin.type === 'BinaryExpression') {
                    	var tomove;
                    	if(bin.left.type === 'Identifier' && bin.left.name === 'NaN') {
                    		tomove = bin.right;
                    	} else if(bin.right.type === 'Identifier' && bin.right.name === 'NaN') {
                    		tomove = bin.left;
                    	}
                    	if(tomove) {
	                    	var src = file.ast.sourceFile.text.slice(tomove.range[0], tomove.range[1]);
	                    	return {
	                    		text: 'isNaN('+src+')', //$NON-NLS-1$
	                    		start: bin.range[0],
	                    		end: bin.range[1]
	                    	};
                    	}
                    }
                }
       		});	
       },
        /** 
		 * @description fix for the 'semi' rule
		 * @function 
		 * @callback
		 */
        "semi": function(annotation, annotations, file) {
        	return applySingleFixToAll(annotations, function(annot){
	            return {
	            	text: ';',
	            	start: annot.end,
	            	end: annot.end
	            };
            });
        },
        /** 
		 * @description fix for the 'unnecessary-nl' rule
		 * @function 
		 * @callback
		 */
        "unnecessary-nls": function(annotation, annotations, file){
        	return applySingleFixToAll(annotations, function(annot){
        		var comment = Finder.findComment(annot.start + 2, file.ast); // Adjust for leading //
        		var nlsTag = annot.data.nlsComment; // We store the nls tag in the annotation
        		if (comment && comment.type.toLowerCase() === 'line' && nlsTag){
					var index = comment.value.indexOf(nlsTag);
					// Check if we can delete the whole comment
					if (index > 0){
						var start = annot.start;
						while (file.ast.sourceFile.text.charAt(start-1) === ' ' || file.ast.sourceFile.text.charAt(start-1) === '\t'){
							start--;
						}
						return {
							text: '',
							start: start,
							end: annot.end
						};
					} else if (index === 0){
						var newComment = comment.value.substring(index+nlsTag.length);
						start = annot.start;
						var end = annot.end;
						if (!newComment.match(/^(\s*|\s*\/\/.*)$/)){
							start += 2; // Only remove leading // if additional comments start with another //
						} else {
							while (file.ast.sourceFile.text.charAt(start-1) === ' ' || file.ast.sourceFile.text.charAt(start-1) === '\t'){
								start--;
							}
						}
						if (newComment.match(/^\s*$/)){
							end = comment.range[1]; // If there is only whitespace left in the comment, delete it entirely
							while (file.ast.sourceFile.text.charAt(start-1) === ' ' || file.ast.sourceFile.text.charAt(start-1) === '\t'){
								start--;
							}
						}
						return {
							text: '',
							start: start,
							end: end
						};
					}
				}
			});
		}
	};
	
	/**
	 * @description Compute the fixes 
	 * @param {Object} query The original Tern query object
	 * @param {Object} file The file object from Tern 
	 */
	function computeFixes(query, file) {
		var func = availableFixes[query.problemId];
		if(typeof func === 'function') {
			var fixes = func.call(this, query.annotation, query.annotations, file);
			if(Array.isArray(fixes)) {
				return fixes;
			} else if(fixes) {
				return [fixes];
			}
		}
		return [];
	}
	
	/**
    * @description Finds the start of the line in the given text starting at the given offset
    * @param {String} text The text
    * @param {Number} offset The offset
    * @returns {Number} The offset in the text of the new line
    */
   function getLineStart(text, offset) {
       if(!text) {
           return 0;
       }
       if(offset < 0) {
           return 0;
       }
       var off = offset;
       var char = text[off];
       while(off > -1 && !/[\r\n]/.test(char)) {
           char = text[--off];
       }
       return off+1; //last char inspected will be @ -1 or the new line char
	}
		
	/**
    * @description Finds the end of the line in the given text starting at the given offset
    * @param {String} text The text
    * @param {Number} offset The offset
    * @returns {Number} The offset in the text before the new line or end of file
    */
   function getLineEnd(text, offset) {
       if(!text) {
           return 0;
       }
       if(offset < 0) {
           return 0;
       }
       var off = offset;
       var char = text[off];
       while(off < text.length && !/[\r\n]/.test(char)) {
           char = text[++off];
       }
       return off;
	}
		
	/**
	 * @description Computes the indent to use in the editor
	 * @param {String} text The editor text
	 * @param {Number} linestart The start of the line
	 * @param {Boolean} extraIndent If we should add an extra indent
	 * @returns {String} The ammount of indent / formatting for the start of the string
	 */
	function computeIndent(text, linestart, extraIndent) {
	    if(!text || linestart < 0) {
	        return '';
	    }
	    var off = linestart;
	    var char = text[off];
	    var preamble = extraIndent ? '\t' : ''; //$NON-NLS-1$
	    //walk the proceeding whitespace so we will insert formatted at the same level
	    while(char === ' ' || char === '\t') {
	       preamble += char;
	       char = text[++off];
	    }
	    return preamble;
	}

    /**
     * @description Computes the formatting for the trailing part of the fix
     * @param {String} text The editor text
     * @param {Object} annotation The annotation object
     * @param {String} indent Additional formatting to apply after the fix
     * @returns {String} The formatting to apply after the fix
     */
    function computePostfix(text, annotation, indent) {
        if(!text || !annotation) {
            return '';
        }
        var off = annotation.start;
        var char = text[off];
	    var val = '';
	    var newline = false;
	    //walk the trailing whitespace so we can see if we need axtra whitespace
	    while(off >= annotation.start && off <= annotation.end) {
		    if(char === '\n') {
		        newline = true;
		        break;
		    }
		    char = text[off++];
	    }
	    if(!newline) {
		    val += '\n'; //$NON-NLS-1$
	    }
	    if(typeof indent !== 'undefined') {
		    val += indent;
	    }
	    return val;
    }
    
    /**
     * @description Computes the offset for the block comment. i.e. 2 if the block starts with /*, 3 if it starts with /**
     * @param {String} text The file text
     * @param {Number} offset The doc node offset
     * @returns {Number} 2 or 3 depending on the start of the comment block
     */
    function getDocOffset(text, offset) {
        if(text.charAt(offset+1) === '*') {
            if(text.charAt(offset+2) === '*') {
                return 3;
            }
            return 2;
        }
        return 0;
    }
	
	/**
	 * @description Updates the eslint directive
	 * @param {String}] text The text of the source file
	 * @param {String} directive The directive text
	 * @param {String} name The name to add
	 * @param {Boolean} usecommas If we should separate the directive entries with commas or not
	 * @returns {String} The new directive text
	 */
	function updateDirective(text, directive, name, usecommas) {
        if(usecommas) {
	        if(text.slice(directive.length).trim() !== '') {
	            return text.trim() + ', '+name; //$NON-NLS-1$
	        }
	        return text.trim() + ' '+name;  //$NON-NLS-1$
        }
	    return text.trim() + ' '+name;  //$NON-NLS-1$
    }
	
	/**
	 * @description Finds the index of the given item in the given list
	 * @param {Array.<Object>} list The array of AST nodes
	 * @param {Object} item The AST node
	 * @returns {Number} The index of the node in the list or -1
	 */
	function indexOf(list, item) {
	    if(list && list.length) {
            for(var i = 0; i < list.length; i++) {
                var p = list[i];
                if(item.range[0] === p.range[0] && item.range[1] === p.range[1]) {
                    return i;
                }
            }
        }
        return -1;
	}
	
	/**
	 * @description Remove the item from the list and return it as a change object
	 * @param {Array.<Object>} list The list of items to remove from
	 * @param {Number} index The index to remove
	 * @returns {Object} A change object containg the properties text, start and end
	 */
    function removeIndexedItemChange(list, index) {
        if(index < 0 || index > list.length) {
	            return;
        }
        var node = list[index];
        if(list.length === 1) {
            return { "start" : node.range[0], "end" : node.range[1], "text" : "" };
        } else if(index === list.length-1) {
            return { "start" : list[index-1].range[1], "end" : node.range[1], "text" : ""};
        } else if(node) {
            return { "start" : node.range[0], "end" : list[index+1].range[0], "text" : ""};
        }
        return null;
    }
    
    /**
     * @description Updates the JSDoc attached to the given AST node
     * @param {Object} node The AST node to update
     * @param {String} source The AST source
     * @param {String} name The name of the doc element to remove
     * @returns {Object} The change object or null
     */
    function updateDoc(node, source, name) {
        if(node.leadingComments && node.leadingComments.length > 0) {
            for(var i = node.leadingComments.length-1; i > -1; i--) {
                var comment = node.leadingComments[i];
                var edit = new RegExp("(\\s*[*]+\\s*(?:@param)\\s*(?:\\{.*\\})?\\s*(?:"+name+")+.*)").exec(comment.value); //$NON-NLS-1$ //$NON-NLS-2$
                if(edit) {
                    var start = comment.range[0] + edit.index + getDocOffset(source, comment.range[0]);
                    return {"start" : start, "end" :start+edit[1].length, "text" : ''};
                }
            }
        }
        return null;
    }

	/**
	 * @description Returns if the JSDoc attached to the given node has any of the given tags
	 * @param {Array.<String>} tags The array of tags
	 * @param {Object} node The AST node
	 * @returns {Boolean} If the doc attached to the given node has one of the given tags
	 */
	function hasDocTag(tags, node) {
		// tags contains all tags that have to be checked
	    if(node.leadingComments) {
	        for(var i = 0; i < node.leadingComments.length; i++) {
	            var comment = node.leadingComments[i];
	            for (var j = 0, len = tags.length; j < len; j++) {
	            	var tag = tags[j];
		            if(comment.value.indexOf(tag) > -1) {
		                return true;
		            }
		        }
	        }
	    }
	    return false;
	}
	
	/**
	 * @description Computes where the eslint directive should be inserted relative to the given node
	 * @param {Object} node The AST node
	 * @returns {Number} The insertion point
	 */
	function getDirectiveInsertionPoint(node) {
	    if(node.type === 'Program' && node.body && node.body.length > 0) {
            var n = node.body[0];
            var val = -1;
            switch(n.type) {
                case 'FunctionDeclaration': {
                    val = getCommentStart(n);
                    if(val > -1) {
                        return val;
                    }
                    //TODO see https://github.com/jquery/esprima/issues/1071
                    val = getCommentStart(n.id);
                    if(val > -1) {
                        return val;
                    }
                    break;
                }
                case 'ExpressionStatement': {
                    if(n.expression && n.expression.right && n.expression.right.type === 'FunctionExpression') {
                        val = getCommentStart(n);
                        if(val > -1) {
                            return val;
                        }
                        //TODO see https://github.com/jquery/esprima/issues/1071
                        val = getCommentStart(n.expression.left);
                        if(val > -1) {
                            return val;
                        }
                    }   
                }
            }
	    }
	    return node.range[0];
	}
	
	/**
	 * @description Returns the offset to use when inserting a comment directive
	 * @param {Object} node The node to check for comments
	 * @returns {Number} The offset to insert the comment
	 */
	function getCommentStart(node) {
	    if(node.leadingComments && node.leadingComments.length > 0) {
            var comment = node.leadingComments[node.leadingComments.length-1];
            if(/(?:@param|@return|@returns|@type|@constructor|@name|@description)/ig.test(comment.value)) {
                //if the immediate comment has any of the tags we use for inferencing, add the directive before it instead of after
                return comment.range[0];
            }
        }
        return -1;
	}
	
	var controlStatements = ['IfStatement', 'WhileStatement', 'ForStatement', 'ForInStatement', 'WithStatement', 'DoWhileStatement', 'ForOfStatement']; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$ //$NON-NLS-5$ //$NON-NLS-6$ //$NON-NLS-7$
	
	/**
	 * @description Walks the parents array and checks to see if there is a control statement as a direct parent
	 * @param {Object} node The AST node to check
	 * @returns {Object} The AST node that is a direct control statement parent of the given node, or null
	 */
	function getControlStatementParent(node) {
		if(node && node.parents) {
			var i = node.parents.length-1,
				p = node.parents[i];
			while(p && i > -1) {
				if(controlStatements.indexOf(p.type) > -1) {
					return p;
				}
				p = node.parents[--i];
			}
		}
		else {
			return null;
		}
	}
	
	/**
	 * Takes a quickfix implementation that can be applied to all fixes in a file and applies it to either all annotations (if multiple annotations provided) or
	 * just to the single annotation.  Handles applying all edits in a single UNDO step as well as setting the caret to the single selected annotation afterward.
	 * @param {Array.<Object>} annotations Array of annotations to apply the fix to
	 * @param {Function} createTextChange function to create a text edit object (text, start, end) for a given annotation
	 */
	function applySingleFixToAll(annotations, createTextChange) {
		var edits = [];
		annotations.forEach(function(current) {
			var change = createTextChange(current);
			if(change) {
				if(Array.isArray(change)) {
					change.forEach(function(fix) {
						edits.push(fix);
					});
				} else {
					edits.push(change);
				}
			}
		});
		// To use setText() with multiple selections they must be in range order
		return edits.sort(function(a, b){
			return a.start - b.start;
		});
	}
});