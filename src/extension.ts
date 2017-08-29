'use strict';

import { workspace, languages, window, commands, ExtensionContext, Disposable } from 'vscode';
import ContentProvider, { encodeLocation } from './provider';

export function activate(context: ExtensionContext) 
{
	const provider = new ContentProvider();

	const commandRegistration = commands.registerTextEditorCommand('editor.printFunctions', editor => {
        return provider.newDocument(editor);
	});

    let contextMenuSwitchSort = commands.registerTextEditorCommand('contextmenu.switchSort', (editor, edit) => {
        provider.updateDocument(editor, edit, true);
    });
    
    let contextMenuRefresh = commands.registerTextEditorCommand('contextmenu.refresh', (editor, edit) => {
        provider.updateDocument(editor, edit, false);
    });

    // let contextMenuSwitchSort = commands.registerCommand('contextmenu.switchSort', () => {
    //     provider.handleDocument(window.activeTextEditor, true);
    // });
    
    // let contextMenuRefresh = commands.registerCommand('contextmenu.refresh', () => {
    //     provider.handleDocument(window.activeTextEditor, false);
    // });
        
	context.subscriptions.push(
		provider,
        commandRegistration,
        contextMenuSwitchSort,
        contextMenuRefresh
    );
}

export function deactivate() 
{
}
