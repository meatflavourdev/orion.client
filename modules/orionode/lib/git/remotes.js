/*******************************************************************************
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env node */
var api = require('../api'), writeError = api.writeError;
var args = require('../args');
var async = require('async');
var git = require('nodegit');
var url = require('url');
var tasks = require('../tasks');
var clone = require('./clone');
var express = require('express');
var bodyParser = require('body-parser');

module.exports = {};

module.exports.router = function(options) {
	var fileRoot = options.fileRoot;
	if (!fileRoot) { throw new Error('options.root is required'); }
	
	module.exports.remoteBranchJSON = remoteBranchJSON;
	module.exports.remoteJSON = remoteJSON;

	return express.Router()
	.use(bodyParser.json())
	.get('/file*', getRemotes)
	.get('/:remoteName/file*', getRemotes)
	.get('/:remoteName/:branchName/file*', getRemotes)
	.delete('/:remoteName*', deleteRemote)
	.post('/file*', addRemote)
	.post('/:remoteName/file*', postRemote)
	.post('/:remoteName/:branchName/file*', postRemote);
	
function remoteBranchJSON(remoteBranch, commit, remote, fileDir, branch){
	var fullName, shortName, remoteURL;
	if (remoteBranch) {
		fullName = remoteBranch.name();
		shortName = remoteBranch.shorthand();
		var branchName = shortName.replace(remote.name() + "/", "");
		remoteURL = api.join(encodeURIComponent(remote.name()), encodeURIComponent(branchName));
	} else {// remote branch does not exists
		shortName = api.join(remote.name(), branch.Name);
		fullName = "refs/remotes/" + shortName;
		remoteURL = api.join(encodeURIComponent(remote.name()), encodeURIComponent(branch.Name));
	}
	return {
		"CloneLocation": "/gitapi/clone" + fileDir,
		"CommitLocation": "/gitapi/commit/" + encodeURIComponent(fullName) + fileDir,
		"DiffLocation": "/gitapi/diff/" + encodeURIComponent(shortName) + fileDir,
		"FullName": fullName,
		"GitUrl": remote.url(),
		"HeadLocation": "/gitapi/commit/HEAD" + fileDir,
		"Id": remoteBranch && commit ? commit.sha() : undefined,
		"IndexLocation": "/gitapi/index" + fileDir,
		"Location": "/gitapi/remote/" + remoteURL + fileDir,
		"Name": shortName,
		"TreeLocation": "/gitapi/tree" + fileDir + "/" + encodeURIComponent(shortName),
		"Type": "RemoteTrackingBranch"
	};
}

function remoteJSON(remote, fileDir, branches) {
	var name = remote.name();
	return {
		"CloneLocation": "/gitapi/clone" + fileDir,
		"IsGerrit": false, // should check 
		"GitUrl": remote.url(),
		"Name": name,
		"Location": "/gitapi/remote/" + encodeURIComponent(name) + fileDir,
		"Type": "Remote",
		"Children": branches
	};
}

function getRemotes(req, res) {
	var remoteName = decodeURIComponent(req.params.remoteName || "");
	var branchName = decodeURIComponent(req.params.branchName || "");
	var filter = req.query.filter;

	var fileDir, theRepo, theRemote;
	if (!remoteName && !branchName) {
		var repo;

		return clone.getRepo(req)
		.then(function(r) {
			repo = r;
			fileDir = api.join(fileRoot, repo.workdir().substring(req.user.workspaceDir.length + 1));
			return git.Remote.list(r);
		})
		.then(function(remotes){
			var r = [];
			async.each(remotes, function(remote, cb) {
				git.Remote.lookup(repo, remote)
				.then(function(remote){
					r.push(remoteJSON(remote, fileDir));
					cb();
				});
			}, function() {
				res.status(200).json({
					"Children": r,
					"Type": "Remote"
				});
			});
		});
	}

	if (remoteName && !branchName) {
		return clone.getRepo(req)
		.then(function(repo) {
			theRepo = repo;
			fileDir = api.join(fileRoot, repo.workdir().substring(req.user.workspaceDir.length + 1));
			return repo.getRemote(remoteName);
		})
		.then(function(remote) {
			theRemote = remote;
			return git.Reference.list(theRepo);
		})
		.then(function(referenceList) {
			referenceList = referenceList.filter(function(ref) {
				if (ref.indexOf("refs/remotes/") === 0) {
					var shortname = ref.replace("refs/remotes/", "");
					if (shortname.indexOf(remoteName) === 0 && (!filter || shortname.indexOf(filter) !== -1)) {
						return true;
					}
				}
			});
			return Promise.all(referenceList.map(function(ref) {
				return git.Reference.lookup(theRepo, ref);
			}))
			.then(function(referenceList) {
				var branches = [];
				async.each(referenceList, function(ref, callback) {
					theRepo.getBranchCommit(ref)
					.then(function(commit) {
						branches.push(remoteBranchJSON(ref, commit, theRemote, fileDir));
						callback();
					}).catch(function(err) {
						callback(err);
					});
				}, function(err) {
					if (err) {
						return writeError(403, res);
					}
					res.status(200).json(remoteJSON(theRemote, fileDir, branches));
				});
			});
		});
	} 

	if (remoteName && branchName) {
		var theBranch;
		return clone.getRepo(req)
		.then(function(repo) {
			theRepo = repo;
			fileDir = api.join(fileRoot, repo.workdir().substring(req.user.workspaceDir.length + 1));
			return repo.getRemote(remoteName);
		})
		.then(function(remote) {
			theRemote = remote;
			return theRepo.getReference("refs/remotes/" + remoteName + "/" + branchName);
		})
		.then(function(branch) {
			theBranch = branch;
			return theRepo.getBranchCommit(branch);
		})
		.then(function(commit) {
			res.status(200).json(remoteBranchJSON(theBranch, commit, theRemote, fileDir));
		})
		.catch(function() {
			return writeError(403, res);
		});
	}
	return writeError(404, res);
}

function addRemote(req, res) {
	var fileDir, repo;
	
	if (!req.body.Remote || !req.body.RemoteURI) {
		return writeError(500, res);
	}

	// It appears that the java server does not let you add a remote if
	// it doesn't have a protocol (it seems to check for a colon).
	var parsedUrl = url.parse(req.body.RemoteURI, true);

	if (!parsedUrl.protocol) {
		writeError(403, res);
	}

	return clone.getRepo(req)
	.then(function(_repo) {
		repo = _repo;
		fileDir = api.join(fileRoot, repo.workdir().substring(req.user.workspaceDir.length + 1));
		return git.Remote.create(repo, req.body.Remote, req.body.RemoteURI);
	})
	.then(function(remote) {
		var remoteName = remote ? remote.name() : req.body.Remote;
		var configFile = api.join(repo.path(), "config");
		function done () {
			res.status(201).json({
				"Location": "/gitapi/remote/" + encodeURIComponent(remoteName) + fileDir
			});
		}
		args.readConfigFile(configFile, function(err, config) {
			if (err) {
				return done();
			}
			var remoteConfig = config.remote[remoteName] || (config.remote[remoteName] = {});
			if (!remoteConfig.url) {
				remoteConfig.url = req.body.RemoteURI;
			}
			if (!remoteConfig.fetch) remoteConfig.fetch = [];
			if (!Array.isArray(remoteConfig.fetch)) remoteConfig.fetch = [remoteConfig.fetch];
			if (req.body.IsGerrit) {
				remoteConfig.fetch.push("+refs/heads/*:refs/remotes/%s/for/*".replace(/%s/g, remoteName));
				remoteConfig.fetch.push("+refs/changes/*:refs/remotes/%s/changes/*".replace(/%s/g, remoteName));
			} else {
				if (req.body.FetchRefSpec) {
					remoteConfig.fetch.push(req.body.FetchRefSpec);
				}
			}
			if (req.body.PushURI) {
				remoteConfig.pushurl = req.body.PushURI;
			}
			if (!remoteConfig.push) remoteConfig.push = [];
			if (!Array.isArray(remoteConfig.push)) remoteConfig.push = [remoteConfig.push];
			if (req.body.PushRefSpec) {
				remoteConfig.push.push(req.body.PushRefSpec);
			}
			args.writeConfigFile(configFile, config, function(err) {
				if (err) {
					// ignore errors
				}
				done();
			});
		});
	})
	.catch(function(err) {
		writeError(403, res, err.message);
	});
}

function postRemote(req, res) {
	if (req.body.Fetch === "true") {
		fetchRemote(req, res, decodeURIComponent(req.params.remoteName), decodeURIComponent(req.params.branchName || ""), req.body.Force);
	} else if (req.body.PushSrcRef) {
		pushRemote(req, res, decodeURIComponent(req.params.remoteName), decodeURIComponent(req.params.branchName || ""), req.body.PushSrcRef, req.body.PushTags, req.body.Force);
	} else {
		writeError(400, res);
	}
}

function fetchRemote(req, res, remote, branch, force) {
	var remoteObj;
	var task = new tasks.Task(res, false, true);
	var repo;
	return clone.getRepo(req)
	.then(function(r) {
		repo = r;
		return git.Remote.lookup(repo, remote);
	})
	.then(function(r) {
		remoteObj = r;
		var refSpec = null;
		if (branch) {
			var remoteBranch = branch;
			if (branch.indexOf("for/") === 0) {
				remoteBranch = branch.substr(4);
			}
			refSpec = "refs/heads/" + remoteBranch + ":refs/remotes/" + remoteObj.name() + "/" + branch;
			if (force) refSpec = "+" + refSpec;
		}
		
		return remoteObj.fetch(
			refSpec ? [refSpec] : null,
			{callbacks: clone.getRemoteCallbacks(req.body, task)},
			"fetch"	
		);
	})
	.then(function(err) {
		if (!err) {
			task.done({
				HttpCode: 200,
				Code: 0,
				DetailedMessage: "OK",
				Message: "OK",
				Severity: "Ok"
			});
		} else {
			throw err;
		}
	})
	.catch(function(err) {
		clone.handleRemoteError(task, err, remoteObj.url());
	});
}

function pushRemote(req, res, remote, branch, pushSrcRef, tags, force) {
	var repo;
	var remoteObj;

	var task = new tasks.Task(res, false, true);

	return clone.getRepo(req)
	.then(function(r) {
		repo = r;
		return git.Remote.lookup(repo, remote);
	})
	.then(function(r) {
		remoteObj = r;
		return repo.getReference(pushSrcRef);
	})
	.then(function(ref) {
		var pushToGerrit = branch.indexOf("for/") === 0;
		var refSpec = ref.name() + ":" + (pushToGerrit ? "refs/" : "refs/heads/") + branch;

		if (force) refSpec = "+" + refSpec;

		return remoteObj.push(
			tags && false ? [refSpec, "refs/tags/*:refs/tags/*"] : [refSpec],
			{callbacks: clone.getRemoteCallbacks(req.body, task)}
		);
	})
	.then(function(err) {
		if (!err) {
			task.done({
				HttpCode: 200,
				Code: 0,
				DetailedMessage: "OK",
				Message: "OK",
				JsonData: {
					Message: "",
					Severity: "Ok",
					Updates: [{
						LocalName: req.body.PushSrcRef,
						RemoteName: remote + "/" + branch,
						Result: "UP_TO_DATE"
					}]
				},
				Severity: "Ok"
			});
		} else {
			throw new Error("Push failed.");
		}
	})
	.catch(function(err) {
		clone.handleRemoteError(task, err, remoteObj.url());
	});
}

function deleteRemote(req, res) {
	var remoteName = decodeURIComponent(req.params.remoteName);
	return clone.getRepo(req)
	.then(function(repo) {
		return git.Remote.delete(repo, remoteName).then(function(resp) {
			if (!resp) {
				res.status(200).end();
			} else {
				writeError(403, res);
			}
		}).catch(function(error) {
			writeError(500, error);
		});
	});
}
};