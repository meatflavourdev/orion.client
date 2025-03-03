/*******************************************************************************
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var express = require('express'),
	path = require('path'),
	orionFile = require('./lib/file'),
	orionWorkspace = require('./lib/workspace'),
	orionGit = require('./lib/git'),
	orionNodeStatic = require('./lib/orionode_static'),
	orionPrefs = require('./lib/controllers/prefs'),
	orionStatic = require('./lib/orion_static'),
	orionTasks = require('./lib/tasks'),
	orionSearch = require('./lib/search'),
	orionMetrics = require('./lib/metrics'),
	orionSites = require('./lib/sites'),
	term = require('term.js');

var LIBS = path.normalize(path.join(__dirname, 'lib/')),
	ORION_CLIENT = path.normalize(path.join(__dirname, '../../'));

function handleError(err) {
	throw err;
}

function startServer(options) {
	options = options || {};
	options.configParams = options.configParams || {};
	options.maxAge = typeof options.maxAge === "number" ? options.maxAge : undefined;
	var workspaceDir = options.workspaceDir;
	if (typeof workspaceDir !== "string") {
		throw new Error("workspaceDir is required")
	}
	
	try {
		var app = express();

		options.app = app;

		function checkAuthenticated(req, res, next) {
			if (!req.user) {
				res.writeHead(401, "Not authenticated");
				res.end();
			} else {
				req.user.workspaceDir = workspaceDir + (req.user.workspace ? "/" + req.user.workspace : "");
				next();
			}
		}

		if (options.configParams["orion.single.user"]) {
			app.use(/* @callback */ function(req, res, next){
				req.user = {UserName: "anonymous"};
				next();
			});
			app.post('/login', function(req, res) {
				if (!req.user) {
					return res.status(200).end();
				}
				return res.status(200).json(req.user);
			});
		} else {
			app.use(require('./lib/user')(options));
		}
		app.use('/site', checkAuthenticated, orionSites(options));

		app.use(term.middleware());
		app.use(orionNodeStatic(path.normalize(path.join(LIBS, 'orionode.client/'))));
		app.use(orionStatic({
			orionClientRoot: ORION_CLIENT,
			maxAge: options.maxAge
		}));
		
		// API handlers
		app.use('/task', checkAuthenticated, orionTasks.orionTasksAPI({
			root: '/task'
		}));
		app.use('/file', checkAuthenticated, orionFile({
			root: '/file'
		}));
		app.use('/workspace', checkAuthenticated, orionWorkspace({
			root: '/workspace',
			fileRoot: '/file'
		}));
		app.use('/gitapi', checkAuthenticated, orionGit({ 
			root: '/gitapi',
			fileRoot: '/file'
		}));
		app.use('/filesearch', checkAuthenticated, orionSearch({
			root: '/filesearch',
			fileRoot: '/file'
		}));
		app.use('/prefs', checkAuthenticated, orionPrefs(options));
		app.use('/metrics', orionMetrics.router(options));

		//error handling
		app.use(function(req, res){
			res.status(404);

			// respond with html page
			if (req.accepts('html')) {
				//res.render('404', { url: req.url });
				return;
			}

			// respond with json
			if (req.accepts('json')) {
				res.send({ error: 'Not found' });
				return;
			}

			// default to plain-text. send()
			res.type('txt').send('Not found');
		});

		return app;
	} catch (e) {
		handleError(e);
	}
}

module.exports = startServer;
