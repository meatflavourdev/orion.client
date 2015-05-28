/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 ******************************************************************************/
/*eslint-env browser, amd*/
define({//Default message bundle
	"Plugin Description": "Plugin Description",
	"Create": "Create",
	"Loading...": "Loading...",
	"Label:": "Label:",
	"Title": "Title",
	"Plugins": "Plugins",
	"User Profile": "User Profile",
	"Git": "Git",
	"Git Settings": "Git Settings",
	"JavascriptAssist": "Tern",
	"Theme":"Editor Styles",
	"Editor Theme":"Editor Styles:",
	"Theme Settings": "Theme Settings",
	"General": "General",
	"Navigation": "Navigation",
	"Font": "Font",
	"Family": "Family",
	"Sans Serif": "Sans Serif",
	"Serif": "Serif",
	"Size": "Size",
	"8pt": "8pt",
	"9pt": "9pt",
	"10pt": "10pt",
	"12pt": "12pt",
	"Color": "Color",
	"Background": "Background",
	"SingleQuotedStrings": "Strings (Single Quoted)",
	"DoubleQuotedStrings": "Strings (Double Quoted)",
	"String Types": "String Types",
	"blue": "blue",
	"Weight": "Weight",
	"Normal": "Normal",
	"Bold": "Bold",
	"BlockComments": "Comments (Block)",
	"LineComments": "Comments (Line)",
	"Comment Types": "Comment Types",
	"green": "green",
	"ControlKeywords": "Keywords (Control)",
	"OperatorKeywords": "Keywords (Operator)",
	"Keyword Types": "Keyword Types",
	"darkred": "darkred",
	"Categories": "Categories",
	"User Name": "User Name:",
	"Full Name": "Full Name:",
	"Email Address": "Email Address:",
	"Email Confirmed": "Email Confirmed:",
	"Account": "Account",
	"Current Password": "Current Password:",
	"New Password": "New Password:",
	"Verify Password": "Verify Password:",
	"UserSettings.PasswordsDoNotMatch" : "New password, and retyped password do not match",
	"UserSettings.TypeCurrentPassword" : "You must type your current password in order to set a new one",
	"UserSettings.InvalidPasswordLength" : "Password must be at least 8 characters long",
	"UserSettings.InvalidPasswordAlpha" : "Password must contain at least one alpha character and one non alpha character",
	"UserSettings.PasswordRules" : "Password must be at least 8 characters long and contain at least one alpha character and one non alpha character",
	"Password": "Password",
	"AOL": "AOL",
	"Yahoo": "Yahoo",
	"Google": "Google",
	"Unlink": "Unlink",
	"Link": "Link",
	"Unlinked": "Unlinked",
	"Linked": "Linked",
	"Linked Accounts": "Linked Accounts",
	"Git Email Address": "Git Email Address:",
	"Git Username": "Git Username:",
	"Git Credentials Storage": "Git Credentials Storage",
	"Update": "Update",
	"Update Profile Settings": "Update Profile Settings",
	"Update Git User Settings": "Update Git User Settings",
	"Update Git Credentials": "Update Git Credentials",
	"UsrProfileUpdateSuccess": "User profile data successfully updated.",
	"GitUsrUpdateSuccess": "Git user data successfully updated.",
	"GitCredsUpdateSuccess": "Git Credentials successfully updated.",
	"Install Plugin": "Install Plugin",
	"Plugin Name:": "Plugin Name:",
	"Author Name:": "Author Name:",
	"Licence:": "Licence:",
	"Description:": "Description:",
	"OrionPlugin": "A plugin for Orion",
	"Plugin Link": "Plugin Link",
	"Install": "Install",
	"PlugInstallByURL": "Install a plugin by specifying its URL",
	"Plugin URL:": "Plugin URL:",
	"Disable": "Disable",
	"Disabled":"Disabled ${0}",
	"DisableTooltip": "Disable the plugin",
	"Enable": "Enable",
	"Enabled":"Enabled ${0}",
	"EnableTooltip": "Enable the plugin",
	"Reload all": "Reload all",
	"ReloadAllPlugs": "Reload all installed plugins",
	"CreatePlug": "Create a new Orion Plugin",
	"FindMorePlugs": "Find More Orion Plugins",
	"Get Plugins": "Get Plugins",
	"Reload": "Reload",
	"ReloadPlug": "Reload the plugin",
	"ReloadingPlugin": "Realoading plugin",
	"ReloadingAllPlugins": "Realoading all plugins",
	"Delete": "Delete",
	"DeletePlugFromConfig": "Delete this plugin from the configuration",
	"DeleteUser" : "Delete User Profile as well as workspaces and projects",
	"DeleteUserComfirmation" : "WARNING: This will permanently delete your user profile as well as all of your work!",
	"TypePlugURL": "Type a plugin url here ...",
	"Already installed": "Already installed",
	"Installed":"Installed ${0}",
	"Installing":"Installing ${0}...",
	"Uninstalled":"Uninstalled ${0}",
	"UninstallCfrm":"Are you sure you want to uninstall '${0}'?",
	"ReloadedPlug":"Reloaded ${0} plugin.",
	"ReloadedNPlugs":"Reloaded ${0} plugins.",
	"Reloaded":"Reloaded ${0}",
	"Services": "Services",
	"Value": "Value",
	"JavaScript Object": "JavaScript Object",
	"CheckJsConsoleDrillDown": "click here, then check javascript console to drill down",
	"Item": "Item",
	"Git Config": "Git Config",
	"GitWorkDir": "Git Working Directory",
	"SelectUnstagedChanges": "Always select changed files",
	"Clear Git Credentials": "Clear Git Credentials",
	"Enable Storage": "Enable Storage:",
	"BrowserCredStoreMsg" : "Please be aware that your credentials will be stored persistently in the browser.",
	"AskEnableKeyStorage" : "Do you wish to enable the Key Storage?",
	"general": "General",
	"validation": "Validation",
	"DeletedGitMsg": "Deleted git credentials for ${0}",
	"Editor": "Editor Settings",
	"editorSettings": "Editor Settings",
	"EditorThemes": "Editor Styles",
	"defaultImportedThemeName": "New Theme",
	"nameImportedTheme": "Please enter a name for this new theme:",
	"dndTheme": "Drag and drop here...",
	"textTheme": "...or paste editor styles here",
	"Import": "Import",
	"Import a theme": "Import a theme",
	"ImportThemeDialogMessage": "You can import a previously exported Orion theme here. If you would like to import a Sublime Text, Brackets or an Eclipse theme, please see this <a href='https://wiki.eclipse.org/Orion/How_Tos/Import_Theme' target='_blank' tabindex='-1'>page</a>.",
	"ImportThemeError": "Ooops! The imported content does not appear to be a valid theme definition.",
	"Export": "Export",
	"Export a theme": "Export a theme",
	"Theme name:": "Theme name:",
	"yourTheme": "yourTheme",
	"fileManagement" : "File Management",
	"typing": "Typing",
	"autoSave": "Auto Save:",
	"autoSaveTimeout": "Save interval (ms):",
	"autoLoad": "Auto Load:",
	"saveDiffs": "Save file as diffs:",
	"trimTrailingWhiteSpace": "Trim Trailing Whitespace on Save:",
	"Restore": "Restore Defaults",
	"Default": "Default",
	"keys": "Keys",
	"tabs": "Tabs",
	"tabSize": "Tab Size:",
	"expandTab": "Insert spaces for tabs:",
	"smoothScrolling": "Smooth Scrolling",
	"scrollAnimation": "Scrolling Animation:",
	"scrollAnimationTimeout": "Scrolling Duration (ms):",
	"keyBindings": "Key Bindings:",
	"rulers": "Rulers",
	"annotationRuler": "Show Annotation Ruler:",
	"lineNumberRuler": "Show Line Number Ruler:",
	"foldingRuler": "Show Folding Ruler:",
	"overviewRuler": "Show Overview Ruler:",
	"zoomRuler": "Show Code Map Ruler:",
	"whitespaces": "White Spaces",
	"wrapping": "Wrapping",
	"wordWrap": "Word Wrap:",
	"showMargin": "Show Margin:",
	"marginOffset": "Margin Column:",
	"showWhitespaces": "Show Whitespace Characters:",
	"autoSaveTimeoutInvalid": "Invalid save interval.",
	"scrollAnimationTimeoutInvalid": "Invalid scrolling duration.",
	"tabSizeInvalid": "Invalid tab size.",
	"localSettingsTooltip" : "Toggle whether this setting is shown in the local editor settings drop down.",
	"editorSettingsInfo": "Use the ${0} and ${1} to toggle whether a given setting is shown in the local editor settings drop down ${2}.",
	"autoPairParentheses": "Autopair (Parentheses):",
	"autoPairBraces": "Autopair {Braces}:",
	"autoPairSquareBrackets": "Autopair [Square] Brackets:",
	"autoPairAngleBrackets": "Autopair <Angle> Brackets:",
	"autoPairQuotations": 'Autopair "Strings":',
	"autoCompleteComments": "Autocomplete /** Block Comments */:",
	"smartIndentation": "Smart Indentation:",
	"sourceControl": "Source Control",
	"showBlame": "Show Blame",
	"languageTools": "Language Tools",
	"showOccurrences": "Show Occurrences:",
	"contentAssistAutoTrigger": "Show Content Assist automatically:",
	"Editor preferences updated": "Editor preferences updated",
	"Editor defaults restored": "Editor defaults restored",
	"Font Size": "Font Size:",
	"New Theme Name:": "New Theme Name:",
	"Font Size:": "Font Size:",
	"Navigation Bar": "Navigation Bar",
	"Navigation Text": "Navigation Text",
	"Search Box": "Search Box",
	"Tool Panel": "Tool Panel",
	"Selection Bar": "Selection Bar",
	"Location": "Location",
	"Content": "Content",
	"Main Panel": "Main Panel",
	"Button": "Button",
	"Button Text": "Button Text",
	"Section Text": "Section Text",
	"Side Panel": "Side Panel",
	"Line Color": "Line Color",
	"Even Line Numbers": "Line Numbers (Even)",
	"Odd Line Numbers": "Line Numbers (Odd)",
	"FunctionNames": "Function Names",
	"Parameters": "Parameters",
	"Foreground": "Foreground",
	"Current Line": "Current Line",
	"Attribute Names": "Attribute Names",
	"Overview Ruler": "Overview Ruler",
	"Tags": "Tags",
	"Annotation Ruler": "Annotation Ruler",
	"Show Guide": "Show Guide",
	"Check Guide": "Check Guide",
	"Cancel": "Cancel",
	"Revert Theme": "Revert Theme",
	"Update Theme": "Update Theme",
	"Theme:": "Theme:",
	"clickDiagram": "Select a theme, or click elements in the diagram to style them individually.",
	"Property Names": "Property Names",
	"HexNumber": "Numbers (Hex)",
	"DecimalNumbers": "Numbers (Decimal)",
	"CSS Text": "CSS Text",
	"COLOR:": "Color:",
	"NEW COLOR:": "New Color:",
	"Ok": "Ok",
	"OR HEX:": "Or Hex: ",
	"pluginStatusNotLoaded": "This plug-in is not loaded.",
	"pluginStatusNotRunning": "This plug-in is disabled.",
	"pluginStatusBroken": "This plug-in could not be loaded.",
	"Website": "Website",
	"License": "License",
	"Login": "Login",
	'clearThemeAndEditorSettings.name': 'Clear themes and editor settings',  //$NON-NLS-0$  //$NON-NLS-1$
	'clearThemeAndEditorSettings.tooltip': 'Clear all settings associated with editor themes and window themes',  //$NON-NLS-0$  //$NON-NLS-1$
	"Settings": "Settings",
	'EclipseThemeName': 'Eclipse',  //$NON-NLS-0$ //$NON-NLS-1$
	'DarkerThemeName': 'Darker',  //$NON-NLS-0$ //$NON-NLS-1$
	'ProspectoThemeName': 'Prospecto',  //$NON-NLS-0$ //$NON-NLS-1$
	'BlueThemeName': 'Blue',  //$NON-NLS-0$  //$NON-NLS-1$
	'AmbienceThemeName': 'Ambience',  //$NON-NLS-0$ //$NON-NLS-1$
	'TierraThemeName': 'Tierra',  //$NON-NLS-0$  //$NON-NLS-1$
	'NimbusThemeName': 'Nimbus',  //$NON-NLS-0$ //$NON-NLS-1$
	'AdelanteThemeName': 'Adelante',  //$NON-NLS-0$ //$NON-NLS-1$
	'Raspberry PiThemeName': 'Raspberry Pi',  //$NON-NLS-0$ //$NON-NLS-1$
    'OrionThemeName': 'Orion',  //$NON-NLS-0$  //$NON-NLS-1$
    'Orion2014ThemeName': 'Orion2014',  //$NON-NLS-0$  //$NON-NLS-1$
    'Green ZoneThemeName': 'Green Zone',  //$NON-NLS-0$  //$NON-NLS-1$
    'Pretty In PinkThemeName': 'Pretty In Pink',  //$NON-NLS-0$  //$NON-NLS-1$
    'Blue MondayThemeName': 'Blue Monday',  //$NON-NLS-0$  //$NON-NLS-1$
    'Vanilla SkiesThemeName': 'Vanilla Skies',  //$NON-NLS-0$  //$NON-NLS-1$
    'BeetlejuiceThemeName': 'Beetlejuice',  //$NON-NLS-0$  //$NON-NLS-1$
    'RedThemeName': 'Red',  //$NON-NLS-0$  //$NON-NLS-1$
    "SettingUpdateSuccess": "${0} settings successfully updated.",
    "buttonSave": "Save",
    "buttonRevert": " Revert",
    "ConfirmRestore": "Restore these settings to their default values?",
    "Theme : " : "Theme : ",
    "Display Language : " : "Display Language : ",
    "cannotDeleteMsg" : " is a default theme that cannot be deleted",
    "confirmDeleteMsg" : "Are you sure you want to delete this theme?",
    "cannotModifyMsg" : "${0} is a default theme that cannot be modified. Please use another name.",
    "settingsRestored" : "Settings restored."
});
