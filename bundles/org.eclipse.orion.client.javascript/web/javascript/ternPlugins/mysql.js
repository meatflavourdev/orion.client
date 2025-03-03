/*******************************************************************************
 * @license
 * Copyright (c) 2015 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node, amd*/
/*globals infer tern resolver*/
/**
 * Tern type index and templates for AMQP node support
 */
define([
	"tern/lib/infer", 
	"tern/lib/tern", 
	"./resolver"
], function(infer, tern, resolver) {

	var templates = [
	/* eslint-disable missing-nls */
		{
			name: "mysql", 
			nodes: {top:true, member:false, prop:false},
			description: " - Node.js require statement for MySQL DB", 
			template: "var mysql = require('mysql');\n"
		},
		{
			name: "mysql connection", 
			nodes: {top:true, member:false, prop:false},
			description: " - create a new MySQL DB connection", 
			template: "var mysql = require('mysql');\n" + 
					  "var ${connection} = mysql.createConnection({\n" +  
  					  "\thost : ${host},\n" +  
  					  "\tuser : ${username},\n" +  
  					  "\tpassword : ${password}\n" +  
					  "});\n" + 
					  "try {\n" +  
					  "\t${connection}.connect();\n" +  
					  "\t${cursor}\n" +  
					  "} finally {\n" +  
					  "\t${connection}.end();\n" +  
					  "}"
		},
		{
			name: "mysql query", 
			nodes: {top:true, member:false, prop:false},
			description: " - create a new MySQL DB query statement", 
			template: "${connection}.query(${sql}, function(error, rows, fields) {\n" + 
					  "\t${cursor}\n" +  
					  "});\n"
		}
		/* eslint-enable missing-nls */
	];
	
	/**
	 * @description Gets the templates that apply to given context
	 * @param {tern.File} file The backing file object from Tern
	 * @param {Number} wordStart The start of the word to complete
	 * @param {Number} wordEnd The end of the word to complete
	 * @param {Function} gather The collector function to call when wanting to add a proposal
	 * @since 9.0
	 * @callback
	 */
	function getTemplates(file, wordStart, wordEnd, gather) {  //file, start, end, completions) {
		var expr = infer.findExpressionAround(file.ast, wordStart, wordEnd, file.scope);
		var tmps = resolver.getTemplatesForNode(templates, expr, wordStart);
		if(tmps) {
			tmps.forEach(function(template) {
				gather(template.name, null, 0, function(c) {
					c.prefix = template.prefix;
					c.description = template.description;
					c.template = template.template;
					c.segments = template.segments;
					c.origin = 'mysql'; //$NON-NLS-1$
					c.type = 'template'; //$NON-NLS-1$
				});
			});
	    }
	} 
	
	/* eslint-enable missing-nls */
	tern.registerPlugin("mysql", /* @callback */ function(server, options) { //$NON-NLS-1$
	    return {
	      defs : defs,
	      passes: {
	      	variableCompletion: getTemplates
	      }
	    };
	});
	
	/* eslint-disable missing-nls */
	var defs = {
		
			  "mysql": {
			    "createConnection": "fn(connectionUri: string) -> Connection",
			    "createPool": "fn(config: PoolConfig) -> Pool",
			    "createPoolCluster": "fn(config?: PoolClusterConfig) -> PoolCluster",
			    "escape": "fn(value: ?) -> string",
			    "format": "fn(sql: string) -> string",
			    "MySql": {
			      "createConnection": "fn(connectionUri: string) -> Connection",
			      "createPool": "fn(config: PoolConfig) -> Pool",
			      "createPoolCluster": "fn(config?: PoolClusterConfig) -> PoolCluster",
			      "escape": "fn(value: ?) -> string",
			      "format": "fn(sql: string) -> string"
			    },
			    "ConnectionStatic": {
			      "createQuery": "fn(sql: string) -> Query"
			    },
			    "Connection": {
			      "config": "ConnectionConfig",
			      "threadId": "number",
			      "beginTransaction": "fn(callback: fn(err: Error))",
			      "connect": "fn()",
			      "commit": "fn(callback: fn(err: Error))",
			      "changeUser": "fn(options: ConnectionOptions)",
			      "query": "QueryFunction",
			      "end": "fn()",
			      "destroy": "fn()",
			      "pause": "fn()",
			      "release": "fn()",
			      "resume": "fn()",
			      "escape": "fn(value: ?) -> string",
			      "escapeId": "fn(value: string) -> string",
			      "format": "fn(sql: string) -> string",
			      "on": "fn(ev: string, callback: fn(args: [?])) -> Connection",
			      "rollback": "fn(callback: fn())"
			    },
			    "Pool": {
			      "config": "PoolConfig",
			      "getConnection": "fn(callback: fn(err: Error, connection: Connection))",
			      "query": "QueryFunction",
			      "end": "fn()",
			      "on": "fn(ev: string, callback: fn(args: [?])) -> Pool"
			    },
			    "PoolCluster": {
			      "config": "PoolClusterConfig",
			      "add": "fn(config: PoolConfig)",
			      "end": "fn()",
			      "getConnection": "fn(callback: fn(err: Error, connection: Connection))",
			      "of": "fn(pattern: string) -> Pool",
			      "on": "fn(ev: string, callback: fn(args: [?])) -> PoolCluster"
			    },
			    "Query": {
			      "sql": "string",
			      "start": "fn()",
			      "determinePacket": "fn(firstByte: number, parser: ?) -> ?",
			      "stream": "fn(options: StreamOptions) -> stream.Readable",
			      "pipe": "fn(callback: fn(args: [?])) -> Query",
			      "on": "fn(ev: string, callback: fn(args: [?])) -> Query"
			    },
			    "QueryFunction": {},
			    "QueryOptions": {
			      "sql": "string",
			      "timeout": "number",
			      "nestTables": "?",
			      "typeCast": "?"
			    },
			    "StreamOptions": {
			      "highWaterMark": "number",
			      "objectMode": "?"
			    },
			    "ConnectionOptions": {
			      "user": "string",
			      "password": "string",
			      "database": "string",
			      "charset": "string"
			    },
			    "ConnectionConfig": {
			      "host": "string",
			      "port": "number",
			      "localAddress": "string",
			      "socketPath": "string",
			      "timezone": "string",
			      "connectTimeout": "number",
			      "stringifyObjects": "bool",
			      "insecureAuth": "bool",
			      "typeCast": "?",
			      "queryFormat": "fn(query: string, values: ?)",
			      "supportBigNumbers": "bool",
			      "bigNumberStrings": "bool",
			      "dateStrings": "bool",
			      "debug": "?",
			      "trace": "bool",
			      "multipleStatements": "bool",
			      "flags": "?",
			      "ssl": "?"
			    },
			    "PoolConfig": {
			      "acquireTimeout": "number",
			      "waitForConnections": "bool",
			      "connectionLimit": "number",
			      "queueLimit": "number"
			    },
			    "PoolClusterConfig": {
			      "canRetry": "bool",
			      "removeNodeErrorCount": "number",
			      "defaultSelector": "string"
			    },
			    "SslCredentials": {
			      "pfx": "string",
			      "key": "string",
			      "passphrase": "string",
			      "cert": "string",
			      "ca": "?",
			      "crl": "?",
			      "ciphers": "string"
			    },
			    "Error": {
			      "code": "string",
			      "errno": "number",
			      "sqlStateMarker": "string",
			      "sqlState": "string",
			      "fieldCount": "number",
			      "stack": "string",
			      "fatal": "bool"
			    }
	  },
	  "!name": "mysql",
	  "!define": {
			"!node": {
				"mysql": {
					"createConnection": "fn(connectionUri: string) -> mysql.Connection",
				    "createPool": "fn(config: mysql.PoolConfig) -> mysql.Pool",
				    "createPoolCluster": "fn(config?: mysql.PoolClusterConfig) -> mysql.PoolCluster",
				    "escape": "fn(value: ?) -> string",
				    "format": "fn(sql: string) -> string"
			    }
			}
		}
	};
});