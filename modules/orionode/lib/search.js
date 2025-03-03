/*******************************************************************************
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
var api = require('./api');
var apiPath = require('./middleware/api_path');
var express = require('express');
var bodyParser = require('body-parser');
var Promise = require('bluebird');
var url = require('url');
var fileUtil = require('./fileUtil');

var fs = Promise.promisifyAll(require('fs'));

var SUBDIR_SEARCH_CONCURRENCY = 10;

module.exports = function(options) {
	var root = options.root;
	var fileRoot = options.fileRoot;
	if (!root) { throw new Error('options.root path required'); }
	var workspaceId = 'orionode';
	var workspaceName = 'Orionode Workspace';
	var fieldList = "Name,NameLower,Length,Directory,LastModified,Location,Path,RegEx,CaseSensitive".split(",");

	function originalFileRoot(req) {
		return req.contextPath + fileRoot;
	}

	function isSearchField(term) {
		for (var i = 0; i < fieldList.length; i++) {
			if (term.lastIndexOf(fieldList[i] + ":", 0) === 0) {
				return true;
			}
		}
		return false;
	}

	function undoLuceneEscape(searchTerm){
		var specialChars = "+-&|!(){}[]^\"~:\\";
		for (var i = 0; i < specialChars.length; i++) {
			var character = specialChars.substring(i,i+1);
			var escaped = "\\" + character;
			searchTerm = searchTerm.replace(new RegExp(escaped,"g"), character);
		}
		return searchTerm;
	}

	function SearchOptions(req, res){
		this.defaultLocation = null;
		this.fileContentSearch = false;
		this.filenamePattern = null;
		this.filenamePatternCaseSensitive = false;
		this.location = null;
		this.regEx = false;
		this.rows = 10000;
		this.scopes = [];
		this.searchTerm = "*";
		this.searchTermCaseSensitive = false;
		this.username = null;

		this.buildSearchOptions = function() {
			var queryObject = url.parse(req.url, true).query;
			var terms = queryObject.q.split(" ");
			for (var i = 0; i < terms.length; i++) {
				var term = terms[i];
				if (isSearchField(term)) {
					if (term.lastIndexOf("NameLower:", 0) === 0) {
						this.filenamePatternCaseSensitive = false;
						this.filenamePattern = term.substring(10);
					} else if (term.lastIndexOf("Location:", 0) === 0) {
						this.location = term.substring(9 + req.contextPath.length);
					} else if (term.lastIndexOf("Name:", 0) === 0) {
						this.filenamePatternCaseSensitive = true;
						this.filenamePattern = term.substring(5);
					} else if (term.lastIndexOf("RegEx:", 0) === 0) {
						this.regEx = true;
					} else if (term.lastIndexOf("CaseSensitive:", 0) === 0) {
						this.searchTermCaseSensitive = true;
					}
				} else {
					this.searchTerm = term;
					this.fileContentSearch = true;
				}
			}

			this.defaultLocation = "/file/" + workspaceId;
		};
	}

	function buildSearchPattern(searchOpts){
		var searchTerm = searchOpts.searchTerm;
		if (!searchOpts.regEx) {
			if (searchTerm.indexOf("\"") === 0) {
				searchTerm = searchTerm.substring(1, searchTerm.length - 1);
			}

			searchTerm = undoLuceneEscape(searchTerm);
			if (searchTerm.indexOf("?") !== -1 || searchTerm.indexOf("*") !== -1) {
				if (searchTerm.indexOf("*") === 0) {
					searchTerm = searchTerm.substring(1);
				}
				if (searchTerm.indexOf("?") !== -1) {
					searchTerm = searchTerm.replace("?", ".");
				}
				if (searchTerm.indexOf("*") !== -1) {
					searchTerm = searchTerm.replace("*", ".*");
				}
			}

			if (!searchOpts.searchTermCaseSensitive) {
				searchTerm = new RegExp(searchTerm, "i");
			} else {
				searchTerm = new RegExp(searchTerm);
			}
		}
		return searchTerm;
	}

	function buildFilenamePattern(searchOpts){
		var filenamePatterns = searchOpts.filenamePattern;
		//Default File Pattern
		if(filenamePatterns === null){
			filenamePatterns = ".*";
		}
		return filenamePatterns.split("/").map(function(filenamePattern) {
			if (filenamePattern.indexOf("?") !== -1 || filenamePattern.indexOf("*") !== -1) {
				if (filenamePattern.indexOf("*") === 0) {
					filenamePattern = filenamePattern.substring(1);
				}
				if (filenamePattern.indexOf("?") !== -1) {
					filenamePattern = filenamePattern.replace("?", ".");
				}
				if (filenamePattern.indexOf("*") !== -1) {
					filenamePattern = filenamePattern.replace("*", ".*");
				}
			}
	
			if (!searchOpts.filenamePatternCaseSensitive) {
				return new RegExp(filenamePattern, "i");
			} else {
				return new RegExp(filenamePattern);
			}
		});
	}

	// @returns promise that resolves once all hits have been added to the `results` object.
	// This is a basically a parallel reduce operation implemented by recursive calls to searchFile()
	// that push the search hits into the `results` array.
	//
	// Note that while this function creates and returns many promises, they fulfill to undefined,
	// and are used only for flow control.
	// TODO clean up
	function searchFile(workspaceDir, dirLocation, filename, searchPattern, filenamePatterns, results){
		var filePath = dirLocation + filename;
		return fs.statAsync(filePath)
		.then(function(stats) {
			/*eslint consistent-return:0*/
			if (stats.isDirectory()) {
				if (filename[0] === ".") {
					// do not search hidden dirs like .git
					return;
				}
				if (filePath.substring(filePath.length-1) !== "/") filePath = filePath + "/";

				return fs.readdirAsync(filePath)
				.then(function(directoryFiles) {
					return Promise.map(directoryFiles, function(entry) {
						return searchFile(workspaceDir, filePath, entry, searchPattern, filenamePatterns, results);
					}, { concurrency: SUBDIR_SEARCH_CONCURRENCY });
				});
			}
			// File case
			
			if (!filenamePatterns.some(function(filenamePattern) {
				return filename.match(filenamePattern);
			})){
				return;
			}
			return fs.readFileAsync(filePath, 'utf8')
			.then(function(file) {
				if (!file.match(searchPattern)) {
					return;
				}
				// We found a hit
				var filePathFromWorkspace = filePath.substring(workspaceDir.length);
				results.push({
					"Directory": stats.isDirectory(),
					"LastModified": stats.mtime.getTime(),
					"Length": stats.size,
					"Location": "/file" + filePathFromWorkspace,
					"Name": filename,
					"Path": workspaceName + filePathFromWorkspace
				});
			});
		});
	}

	return express.Router()
	.use(bodyParser.json())
	.use(apiPath(root))
	.get('*', function(req, res, next) {
		var searchOpt = new SearchOptions(req, res);
		searchOpt.buildSearchOptions();

		var searchPattern = buildSearchPattern(searchOpt);
		var filenamePattern = buildFilenamePattern(searchOpt);

		var parentFileLocation = originalFileRoot(req);
		var endOfFileRootIndex = 5;

		var searchScope = req.user.workspaceDir + searchOpt.location.substring(endOfFileRootIndex, searchOpt.location.length - 1);
		if (searchScope.charAt(searchScope.length - 1) !== "/") searchScope = searchScope + "/";

		fileUtil.getChildren(searchScope, parentFileLocation, null)
		.then(function(children) {
			var results = [];

			return Promise.map(children, function(child) {
				var childName = child.Location.substring(endOfFileRootIndex + 1);
				return searchFile(req.user.workspaceDir, searchScope, childName, searchPattern, filenamePattern, results);
			}, { concurrency: SUBDIR_SEARCH_CONCURRENCY })
			.catch(function(/*err*/) {
				// Probably an error reading some file or directory -- ignore
			})
			.then(function() {
				res.json({
					"response": {
						"docs": results,
						"numFound": results.length,
						"start": 0
					},
					"responseHeader": {
						"params": {
							"fl": "Name,NameLower,Length,Directory,LastModified,Location,Path,RegEx,CaseSensitive",
							"fq": [
								"Location:"+searchOpt.location,
								"UserName:anonymous"
							],
							"rows": "10000",
							"sort": "Path asc",
							"start": "0",
							"wt": "json"
						},
						"status": 0
					}
				});
			});
		})
		.catch(api.writeError.bind(null, 500, res));
	});
};
