/*******************************************************************************
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node*/
var apiPath = require('./middleware/api_path');
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var util = require('util');
var api = require('./api');
var fileUtil = require('./fileUtil');
var writeError = api.writeError;

module.exports = function(options) {
	var workspaceRoot = options.root;
	var fileRoot = options.fileRoot;
	if (!workspaceRoot) {
		throw new Error('options.root path required');
	}

	var workspaceId = 'orionode';
	var workspaceName = 'Orionode Workspace';

	/**
	 * @returns {String} The URL of the workspace middleware, with context path.
	 */
	function originalWorkspaceRoot(req) {
		return req.contextPath + workspaceRoot;
	}
	function originalFileRoot(req) {
		return req.contextPath + fileRoot;
	}
	function makeProjectContentLocation(req, projectName) {
		return api.join(originalFileRoot(req), projectName);
	}
	function makeProjectLocation(req, projectName) {
		return req.contextPath + api.join(fileRoot, projectName);
	}

	var router = express.Router();
	router.use(bodyParser.json());
	router.use(apiPath(workspaceRoot));

	router.get('*', function(req, res, next) {
		var rest = req.pathSuffix;
		var workspaceRootUrl = originalWorkspaceRoot(req);
		//var workspaceRootUrl = req.pathPrefix;
		if (rest === '') {
			// http://wiki.eclipse.org/Orion/Server_API/Workspace_API#Getting_the_list_of_available_workspaces
			fileUtil.withStats(req.user.workspaceDir, function(err, stats) {
				if (err) {
					api.writeError(500, res, "Could not open the workspace directory");
					return;
				}
				res.json({
					Id: 'anonymous',
					Name: 'anonymous',
					UserName: 'anonymous',
					Workspaces: [{
						Id: workspaceId,
						LastModified: stats.mtime.getTime(),
						Location: api.join(workspaceRootUrl, workspaceId),
						Name: workspaceName
					}]
				});
			});
		} else if (rest === workspaceId) {
			// http://wiki.eclipse.org/Orion/Server_API/Workspace_API#Getting_workspace_metadata
			var parentFileLocation = originalFileRoot(req);
			fileUtil.getChildren(req.user.workspaceDir, parentFileLocation, null)
			.then(function(children) {
				// TODO this is basically a File object with 1 more field. Should unify the JSON between workspace.js and file.js
				res.json({
					Directory: true,
					Id: workspaceId,
					Name: workspaceName,
					Location: api.join(workspaceRootUrl, workspaceId),
					ChildrenLocation: api.join(workspaceRootUrl, workspaceId), // ?? // api.join(fileRoot, workspaceId, '?depth=1'),
					Children: children,
					Projects: children.map(function(c) {
						return {
							Id: c.Name,
							Location:  api.join(parentFileLocation, c.Name),
						};
					})
				});
			})
			.catch(api.writeError.bind(null, 500, res));
		} else {
			res.statusCode = 400;
			res.end(util.format('workspace not found: %s', rest));
		}
	});

	router.post('*', function(req, res, next) {
			var rest = req.pathSuffix;
			var err;
			if (rest === '') {
				// Create workspace. unsupported
				err = {Message: 'Unsupported operation: create workspace'};
				res.statusCode = 403;
				res.end(JSON.stringify(err));
			} else if (rest === workspaceId) {
				var projectName = req.headers.slug || (req.body && req.body.Name);
				if (!projectName) {
					err = {Message: 'Missing "Slug" header or "Name" parameter'};
					res.statusCode = 400;
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify(err));
					return;
				}
				// Move/Rename a project
				var location = req.body && req.body.Location;
				if (location) {
					var wwwpath = encodeURIComponent(projectName),
					    filepath = fileUtil.safeFilePath(req.user.workspaceDir, projectName);

					// Call the File POST helper to handle the filesystem operation. We inject the Project-specific metadata
					// into the resulting File object.
					fileUtil.handleFilePOST(req.user.workspaceDir, fileRoot, req, res, wwwpath, filepath, {
						Id: projectName,
						ContentLocation: makeProjectContentLocation(req, projectName),
						Location: makeProjectLocation(req, projectName)
					}, /*renaming a project is always 200 status*/ 200);
					return;
				}
				// Create a project
				fs.mkdir(fileUtil.safeFilePath(req.user.workspaceDir, projectName), parseInt('0755', 8), function(error) {
					if (error) {
						err = {Message: error};
						res.statusCode = 400;
						res.end(JSON.stringify(error));
					} else {
						var newProject = JSON.stringify({
							Id: projectName,
							ContentLocation: makeProjectContentLocation(req, projectName), // Important
							Location: makeProjectLocation(req, projectName) // not important
						});
						res.statusCode = 201;
						res.setHeader('Content-Type', 'application/json');
						res.setHeader('Content-Length', newProject.length);
						res.end(newProject);
					}
				});
			}
	});

	router.put('*', function(req, res, next) {
		// Would 501 be more appropriate?
		writeError(403, res);
	});

	router.delete('*', function(req, res) {
		// Would 501 be more appropriate?
		writeError(403, res);
	});

	return router;
};
