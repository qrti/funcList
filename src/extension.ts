'use strict';

import { workspace, languages, window, commands, ExtensionContext, Disposable } from 'vscode';
import ContentProvider, { encodeLocation } from './provider';

export function activate(context: ExtensionContext) 
{
	const provider = new ContentProvider();

	const providerRegistrations = Disposable.from(
		workspace.registerTextDocumentContentProvider(ContentProvider.scheme, provider)
	);

	const commandRegistration = commands.registerTextEditorCommand('editor.printFunctions', editor => {
        return provider.newDocument(editor, null);
	});

    let contextMenuSwitchSort = commands.registerCommand('contextmenu.switchSort', () => {
        provider.contextMenuSwitchSort();
    });

    let contextMenuSwitchRefresh = commands.registerCommand('contextmenu.refresh', () => {
        provider.contextMenuRefresh();
    });

	context.subscriptions.push(
		provider,
        commandRegistration,
        contextMenuSwitchSort,
        contextMenuSwitchRefresh,
		providerRegistrations
    );
}

export function deactivate() 
{
}
