// funcList extension for vsCode V0.5 by qrt@qland.de 170809
//
// V0.5     initial
//
// todo:

'use strict';

import * as vscode from 'vscode';
import { workspace, window, Disposable, Uri, Position } from 'vscode';

import FunctionsDocument from './functionsDocument';

// interface docVal { source: string; func: Map<string, number>; doc: FunctionsDocument; sort: number }
type docVal = { func: Map<string, {native: string, num: number}>, doc: FunctionsDocument, sort: number }

export default class Provider implements vscode.TextDocumentContentProvider 
{
	static scheme = 'functions';

	private _documents = new Map<string, docVal>();
    private _onDidChange = new vscode.EventEmitter<Uri>();   
    private _subscriptions: Disposable[] = [];
    private _disposable: Disposable;

    private _selBlock: number = 0;
    private _docSort: number;
    private _lastHit: { editor: vscode.TextEditor, native: string, lineIndex: number } = 
                      { editor: null,              native: null,   lineIndex: 0 };

    readonly NUM_SORTS = 2;

    constructor() 
    {
        workspace.onDidCloseTextDocument(targetDoc => { this._documents.delete(targetDoc.uri.toString()); },    // fires several minutes after closing document
                                                        this, this._subscriptions);

        // window.onDidChangeActiveTextEditor(this._onDidChangeActiveTextEditor, this, this._subscriptions);
        window.onDidChangeTextEditorSelection(this._onDidChangeTextEditorSelection, this, this._subscriptions);                            

        this._disposable = Disposable.from(...(this._subscriptions));
    }

    dispose() 
    {
        this._disposable.dispose();
		this._documents.clear();
        this._onDidChange.dispose();
	}

	get onDidChange(){                          // expose an event to signal changes of _virtual_ documents to the editor
        return this._onDidChange.event;
	}
    
    // private _onDidChangeActiveTextEditor() 
    // {
    //     console.log("change ActiveTextEditor");
    // }
            
    private _onDidChangeTextEditorSelection() 
    {
        if(window.activeTextEditor.document.uri.scheme === Provider.scheme){                    // Provider.scheme (target file) documents only
            if(new Date().getTime() > this._selBlock){                 
                let sourceFsPath = this.decodeFsPath(window.activeTextEditor.document.uri);     // get original source fsPath from target uri.query

                // find current sourceEditor for original source fsPath, 
                // the original sourceEditor gets unvalid every time it loses focus
                let sourceEditor = window.visibleTextEditors.find(editor => editor.document.uri.fsPath === sourceFsPath);

                if(sourceEditor){                                                       // invalid or disposed?                                              
                    let symbolIndex = window.activeTextEditor.selection.start.line - 2; // index of symbol 
                    let docVal = this._documents.get(window.activeTextEditor.document.uri.toString());  // stored target document value
                    let native = Array.from(docVal.func.values())[symbolIndex].native;  // stored native match                                        

                    let chars = { '(':'\\(', ')':'\\)', '[':'\\[' };                    // replacement pairs, name:value
                    let filter = native.replace(/[()[]/g, m => chars[m]);               // replace /[names]/globaly through values
                    
                    let docContent = sourceEditor.document.getText();                   // get source document content
                    let sourceLines = docContent.split("\r\n");                         // split lines
                    let lines: number[] = [];                                           // prepare match lines number array
                    
                    sourceLines.forEach((line, i) => {                                  // iterate through sourceLines
                        if(line.match(filter))                                          // if match 
                             lines.push(i);                                             // add line number
                    });
                    
                    let hit = this._lastHit;                                            // last hit shortcut        

                    if(lines){                                                          // any lines?
                        let lineIndex = 0;                                              // assume first match in lines

                        if(hit.editor==sourceEditor && hit.native==native && hit.lineIndex<lines.length){   // same editor, same match, hit index in range
                            lineIndex = hit.lineIndex++;                                // take index, increment hit index
                        }
                        else{
                            hit.editor = sourceEditor;                                  // update hit object
                            hit.native = native;
                            hit.lineIndex = 1;
                        }                        

                        let sourceLine = lines[lineIndex];                              // get source line number

                        let posSel = new vscode.Position(sourceLine, 0);                // prepare selection and range in source
                        let selection = new vscode.Selection(posSel, posSel);
                        let posStart = new vscode.Position(sourceLine-10<0 ? 0 : sourceLine-10, 0);
                        let posEnd = new vscode.Position(Number.MAX_SAFE_INTEGER, 0);
                        let range = new vscode.Range(posStart, posEnd);

                        var cSel = window.activeTextEditor.selection;                   // prepare selection in target
                        var nSelStart = new vscode.Position(cSel.start.line, 0);
                        var nSelEnd = new vscode.Position(cSel.end.line, 99);
                        var nSel = new vscode.Selection(nSelStart, nSelEnd);
                        window.activeTextEditor.selection = nSel;                       // set selection, triggers a new onDidChangeTextEditorSelection event   
                        
                        sourceEditor.revealRange(range);                                // set range
                        sourceEditor.selection = selection;                             // set selection, triggers a new onDidChangeTextEditorSelection event     
                    
                        this._selBlock = new Date().getTime() + 250;
                    }
                }
            }
        }
    }

    // command palette 'Function List'
    //
    newDocument(editor, sortSwitch)
    {                
        if(editor.document.uri.scheme === Provider.scheme){                                                 // Provider.scheme target document?                                    
            if(sortSwitch == null)                                                                          // called from extension.ts?
                return null;                                                                                // break action
            
            let sourceFsPath = this.decodeFsPath(window.activeTextEditor.document.uri);                     // get original source fsPath from target uri.query
            let sourceEditor = window.visibleTextEditors.find(e => e.document.uri.fsPath === sourceFsPath); // find current sourceEditor for original source fsPath
            
            if(!sourceEditor)                                                                               // source editor valid?
                return null;                                                                                // break action
           
            let sort = this._documents.get(editor.document.uri.toString()).sort;                            // get sort of old target document before closing it
            this._docSort = sortSwitch ? (++sort>=this.NUM_SORTS ? 0 : this.NUM_SORTS) : sort;              // switch or take current sort

            vscode.commands.executeCommand('workbench.action.closeActiveEditor');                           // close old target document
            editor = sourceEditor;                                                                          // source editor as source
        }
        else{                                                                                               // file scheme source document
            let config = workspace.getConfiguration('funcList');                                            // get config
            this._docSort = config.get("sortList");                                                         // default sort for new target document
        }

        const uri = encodeLocation(editor.document.uri, editor.selection.active);                                   // encode uri
        return workspace.openTextDocument(uri).then(doc => window.showTextDocument(doc, editor.viewColumn + 1));    // open (triggers provideTextDocumentContent) and show new document 
    }
    
    // context menu command from target editor, filtered by package/languages/extensions
    //
    contextMenuSwitchSort()
    {        
        this.newDocument(window.activeTextEditor, true);
    }

    // context menu command from target editor, filtered by package/languages/extensions
    //
    contextMenuRefresh()
    {        
        this.newDocument(window.activeTextEditor, false);
    }

    // triggered by openTextDocument
    //
	provideTextDocumentContent(target_uri: Uri): string | Thenable<string> {
        let functionList = this.getFunctionList(window.activeTextEditor.document, this._docSort);

        let document = new FunctionsDocument(target_uri, functionList, this._docSort, this._onDidChange);
        let docval: docVal = { func: functionList, doc: document, sort: this._docSort };
        this._documents.set(target_uri.toString(), docval);

        return document.value;
	}
    
    private getFunctionList(doc: vscode.TextDocument, sort: number)
    {
        let config = workspace.getConfiguration('funcList');                        // get config
        let nativeFilter = stringRegExp(config.get("nativeFilter"));                // native  filter

        let grin = { value: 0 };                                                    // group index
        let displayFilter = stringRegExp(config.get("displayFilter"), grin);        // display 

        let docContent = doc.getText();                                             // get doc text
        let native = docContent.match(nativeFilter);                                // nativeFind array    
        
        let map = new Map<string, { native: string, num: number }>();               // displayFind, { nativeFind, numFind }

        if(native){
            native.forEach(native => {
                let display = native.match(displayFilter)[grin.value];                       // display filter
                let value = map.get(display);                                       // get { nativeFind, numFind }
                
                if(value)                                                           // existing { nativeFind, numFind }
                    value.num++;
                else                                                                // initial
                    map.set(display, { native: native, num: 1 });
            });
        }

        return sort ? new Map(Array.from(map).sort()) : map;                        // sort displayFind
    }

    private decodeFsPath(uri: Uri): string
    {
        let [target, line, character] = <[string, number, number]>JSON.parse(uri.query);
        return decodeURIComponent(Uri.parse(target).toString()).split('///').pop().replace(/\//gi, "\\");
    }
}

//------------------------------------------------------------------------------

let seq = 0;

export function encodeLocation(uri: Uri, pos: Position): Uri 
{
    const query = JSON.stringify([uri.toString(), pos.line, pos.character]);
    const tabCaption = decodeURIComponent(uri.fsPath).split('\\').pop();
	return Uri.parse(`${Provider.scheme}:(${tabCaption})?${query}#${seq++}`);
}

export function decodeLocation(uri: Uri): [Uri, Position] 
{    
	let [target, line, character] = <[string, number, number]>JSON.parse(uri.query);
	return [Uri.parse(target), new Position(line, character)];
}

export function stringRegExp(s: string, grin?: { value: number } ): RegExp
{
    let flags: string = s.replace(/.*\/([gimy0-9]*)$/, '$1');
    let pattern: string = s.replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');

    if(grin){
        let p = flags.search(/\d/);

        if(p != undefined){
            grin.value = +flags.substr(p, 1);
            flags = flags.replace(/[0-9]/, '');
        }
    }

    return new RegExp(pattern, flags);    
}

//------------------------------------------------------------------------------

// sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0));

// for newDocument(), check for existing scheme document and return it
// 
// let doc = vscode.workspace.textDocuments.find(doc => doc.uri.scheme === Provider.scheme);
//
// if(doc != null)
//     return vscode.window.showTextDocument(doc, editor.viewColumn + 1);        

// getFunctionlist with line number references
//
// private getFunctionList(doc: vscode.TextDocument)
// {
//     let config = workspace.getConfiguration('funcList');                
// 
//     let searchFilter = this.stringRegExp(config.get("searchFilter"));
//     let displayfilter = this.stringRegExp(config.get("displayFilter"));
//     this._sortList = config.get("sortList");
// 
//     let docContent = doc.getText();
//     let lines = docContent.split("\r\n"); 
// 
//     let lineMap = new Map<string, number>();     
// 
//     lines.forEach((line, i) => {
//         let result = line.match(searchFilter);
// 
//         if(result)
//             lineMap.set(result[0].match(displayfilter)[0], i);
//     });
// 
//     return this._sortList ? new Map(Array.from(lineMap).sort()) : lineMap;
// }

// private quickPick()
// {
//     let items: vscode.QuickPickItem[] = [];
// 
//     items.push({ label: "toUpper", description: "Convert [aBc] to [ABC]" });
//     items.push({ label: "toLower", description: "Convert [aBc] to [abc]" });
//     items.push({ label: "swapCase", description: "Convert [aBc] to [AbC]" });
// 
//     vscode.window.showQuickPick(items).then(selection => {
//         // the user canceled the selection
//         if(!selection){
//             return;
//         }
// 
//         // the user selected some item. You could use `selection.name` too
//         switch(selection.description){
//             case "toUpper": 
//                 break;
// 
//             case "toLower": 
//                 break;
// 
//             default:
//                 break;
//         }
//     });
// }