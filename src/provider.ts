// funcList extension for vsCode V7.6.1 by qrt@qland.de 190221
//
// V0.5     initial, document content provider
// V0.6     regular TextDocument -> refreshable without closing -> keeps width
// V7.0.0   back to (modified) document content provider
// V7.1.0   changed end of line handling
// V7.2.1   linux/mac path bug fix, corrected symbol match, new sort option
// V7.3.0   global filters for multiple filtypes
// V7.3.1   updated readme
// V7.6.0   reworked virtual document handling
// V7.6.1   updated readme
//
// todo:

'use strict';

import * as vscode from 'vscode';
import { workspace, window, Disposable, Uri, Position } from 'vscode';
import FunctionsDocument from './functionsDocument';

export default class Provider implements vscode.TextDocumentContentProvider        
{
	static scheme = 'functions';

    // private _onDidChange = new vscode.EventEmitter<Uri>();       
    
    private _funcDocs = new Map<string, FunctionsDocument>();
    private _timer = new Timer();    
    private _subscriptions: Disposable[] = [];
    private _disposable: Disposable;

    private _lastHit: { editor: vscode.TextEditor, native: string, lineIndex: number } = 
                      { editor: null,              native: null,   lineIndex: 0 };                          

    constructor() 
    {
        // workspace.onDidChangeTextDocument(change => this._onDidChangeTextDocument(change), this, this._subscriptions);
        window.onDidChangeTextEditorSelection(change => this._onDidChangeTextEditorSelection(change), this, this._subscriptions);                            
        workspace.onDidCloseTextDocument(doc => this._onDidCloseTextDocument(doc), this, this._subscriptions);   // fires up to several seconds after closing document
        this._disposable = Disposable.from(...(this._subscriptions));
    }    

    public dispose() 
    {                 
        this._disposable.dispose();
        this._funcDocs.clear();
        // this._onDidChange.dispose();        
	}

    // get onDidChange()                                                                   // expose an event to signal changes of _virtual_ documents to the editor
    // {                                                          
    //     return this._onDidChange.event;
	// }

    // private _onDidChangeTextDocument(change: vscode.TextDocumentChangeEvent) 
    // {
    // }

    private _onDidChangeTextEditorSelection(change: vscode.TextEditorSelectionChangeEvent) 
    {    
        let editor = change.textEditor;                                                 // get active editor

        if(editor.document.uri.scheme === Provider.scheme)                              // funcList files only 
            if(!this._timer.timeLeft())                                                 // last timer ready?
                this._timer.start(() => this.posSourceSelTarget(editor), 50, 100);      // delay, block
    }

    private _onDidCloseTextDocument(doc: vscode.TextDocument)
    {
        const mapUri = encodeUri(doc.uri, false);                               // encode target uri, fragment 0
        let funcDoc = this._funcDocs.get(mapUri.toString());                    // search funcDoc in map

        if(funcDoc)                                                             // if funcDoc exists
            this._funcDocs.delete(mapUri.toString());                           // delete it
    }

    private posSourceSelTarget(editor)
    {
        let sourceFsPath = decodeFsPath(editor.document.uri);                   // get original source fsPath from target uri.query

        // find current sourceEditor for original source fsPath, 
        // the original sourceEditor gets unvalid every time it loses focus
        let sourceEditor = window.visibleTextEditors.find(editor => editor.document.uri.fsPath === sourceFsPath);
        
        if(sourceEditor){                                                       // if not invalid or disposed
            let funcDoc = this.getFuncDoc(editor.document.uri);                 // search funcDoc in map
            let doubleSpacing = funcDoc.getDoubleSpacing();                     // get double spacing
            let symbolIndex = editor.selection.start.line - 2;                  // first valid line

            if(doubleSpacing){                                                  // handle double spacing
                symbolIndex -= 1;                                               // correct first valid line

                if(Math.round(symbolIndex % 2))                                 // spacing line?
                    return;                                                     // break

                symbolIndex = Math.round(symbolIndex / 2 + 0.1);                // calc line
            }

            if(symbolIndex < 0)                                                 // no source document positioning
                return;                                                         // after updateDocument or line 0 or 1 click

            let natSym = funcDoc.getNative(symbolIndex);                        // get native symbol string
            let natFil = funcDoc.getNativeFilter();                             //            filter

            let chars = { '(':'\\(', ')':'\\)', '[':'\\[' };                    // replacement pairs, name:value
            let natSymFil = natSym.replace(/[()[]/g, m => chars[m]);            // replace /[names]/globally through values

            let docContent = sourceEditor.document.getText();                   // get source document content
            let sourceLines = docContent.split("\n");                           // split lines            
            let lines: number[] = [];                                           // prepare match lines number array
            
            sourceLines.forEach((line, i) => {                                  // iterate through sourceLines
                if(line.match(natSymFil) && line.match(natFil))                 // if match 
                    lines.push(i);                                              // add line number
            });

            let hit = this._lastHit;                                            // last hit shortcut        

            if(lines.length){                                                   // any lines?
                let lineIndex = 0;                                              // assume first match in lines

                if(hit.editor==sourceEditor && hit.native==natSym && hit.lineIndex<lines.length){   // same editor, same match, hit index in range
                    lineIndex = hit.lineIndex++;                                // take index, increment hit index
                }
                else{
                    hit.editor = sourceEditor;                                  // update hit object
                    hit.native = natSym;
                    hit.lineIndex = 1;
                }                        

                let sourceLine = lines[lineIndex];                              // get source line number

                let posSel = new vscode.Position(sourceLine, 0);                // prepare selection and range in source
                let selection = new vscode.Selection(posSel, posSel);
                let posStart = new vscode.Position(sourceLine-10<0 ? 0 : sourceLine-10, 0);
                let posEnd = new vscode.Position(Number.MAX_SAFE_INTEGER, 0);
                let range = new vscode.Range(posStart, posEnd);

                var cSel = editor.selection;                                    // prepare selection in target
                var nSelStart = new vscode.Position(cSel.start.line, 0);
                var nSelEnd = new vscode.Position(cSel.end.line, 99);
                var nSel = new vscode.Selection(nSelStart, nSelEnd);
                editor.selection = nSel;                                        // set selection, triggers a new onDidChangeTextEditorSelection event   
                
                sourceEditor.revealRange(range);                                // set range
                sourceEditor.selection = selection;                             // set selection, triggers a new onDidChangeTextEditorSelection event                 
            }
        }
    }

    // command palette 'Function List'
    //
    public async newDocument(sourceEditor)
    {                
        if(sourceEditor.document.uri.scheme != Provider.scheme){                // block funcList files                                
            let config = workspace.getConfiguration('funcList');                // get config
            var filters = config.get('filters');                                //     filter array
            var filter;                                                         // prepare filter
            var fname = sourceEditor.document.fileName.toLowerCase();           //         extension match
            var len = fname.length;

            (function(){                                                        // match extension
                Object.keys(filters).forEach(f => { 
                    filters[f].extensions.forEach(e => {
                        if(e.toLowerCase() === fname.substr(len - e.length, e.length)){
                            filter = filters[f]; 
                            return;
                        }
                    });   
                });
            })();

            if(!filter){                                                                    // extension not found
                window.showInformationMessage('no filter for filetype');
            }
            else{                
                const targetUri = encodeUri(sourceEditor.document.uri, true);               // encode target uri, source uri in query, fragment++
                const mapUri = targetUri.with( { fragment: "0" } );                         // mapUri with fragment 0
                let funcDoc = this._funcDocs.get(mapUri.toString());                        // search funcDoc in map

                if(!funcDoc){                                                               // new funcDoc
                    funcDoc = new FunctionsDocument(sourceEditor, filter, targetUri);       // prepare new funcDoc content
                    this._funcDocs.set(mapUri.toString(), funcDoc);                         // add new funcDoc to funcDocs                                                            
                }
                else{                                                                       // already existing funcDoc
                    funcDoc.update(false);                                                  // update
                }

                let doc = await workspace.openTextDocument(targetUri);                      // open TextDocument -> provideTextDocumentContent
                await window.showTextDocument(doc, sourceEditor.viewColumn + 1);            // show                        
            }
        }

        return null;
    }
    
    // context menu 'Switch Sort' + 'Refresh' 
    //
    public async updateDocument(sortSwitch)
    {                
        let { uri } = window.activeTextEditor.document;                                                         // get active editor

        if(uri.scheme === Provider.scheme){                                                                     // existing funcList file?                                               
            let sourceFsPath = decodeFsPath(uri);                                                               // get original source fsPath from target uri.query            
            let sourceEditor = window.visibleTextEditors.find(e => e.document.uri.fsPath === sourceFsPath);     // find current sourceEditor for original source fsPath

            if(sourceEditor){                                                                                   // source editor valid?
                const targetUri = encodeUri(sourceEditor.document.uri, true);                                   // encode target uri, source uri in query

                let funcDoc = this.getFuncDoc(targetUri);                                                       // search funcDoc in map
                funcDoc.update(sortSwitch);                                                                     // update or toggle sort  

                let doc = await workspace.openTextDocument(targetUri);                                          // open new TextDocument as target
                await window.showTextDocument(doc, sourceEditor.viewColumn + 1);
            }
        }
    }

    // triggered by openTextDocument in newDocument
    //
    provideTextDocumentContent(target_uri: Uri): string | Thenable<string> 
    {        
        let funcDoc = this.getFuncDoc(target_uri);                              // get funcDoc
        return funcDoc.getContent();                                            // return empty document content
    }                                                                                                       

    private getFuncDoc(uri: Uri): FunctionsDocument
    {
        let mapUri = uri.with( { fragment: "0" } );                             // fragment 0
        return this._funcDocs.get(mapUri.toString());                           // search funcDoc in map
    }
}

//------------------------------------------------------------------------------

let seq = 1;                                                                    // uri fragment counter

// surrounds tabCaption with brackets
//
export function encodeUri(uri: Uri, count: Boolean): Uri 
{
    const query = JSON.stringify([uri.toString(), 0, 0]);
    const tabCaption = decodeURIComponent(uri.fsPath).split('\\').pop().split('/').pop();
	return Uri.parse(`${Provider.scheme}:(${tabCaption})?${query}#${count?seq++:0}`);
}

// win32    file:///d:/../name.ext   -> d:\..\name.ext
// other    file:///home/../name.ext -> /home/../name.ext
//
export function decodeFsPath(uri: Uri): string
{
    var path;

    let [target, line, character] = <[string, number, number]>JSON.parse(uri.query);

    if(process.platform === "win32")        // darwin (=macos) | freebsd | linux | sunos | win32    
        path = decodeURIComponent(Uri.parse(target).toString()).split('///').pop().replace(/\//gi, "\\");    
    else
        path = decodeURIComponent(Uri.parse(target).toString()).split('//').pop();

    return path;
}    

// delay - for executing posSourceSelTarget
// block - to block trailing selection events after posSourceSelTarget
//
class Timer
{
    private end = 0;

    start(callback, delay, block) 
    {
        this.end = new Date().getTime() + delay + block;
        setTimeout(callback, delay);
    }

    timeLeft()
    {
        let left = this.end - new Date().getTime();
        return left>0 ? left : 0;
    }
}

//------------------------------------------------------------------------------

// regular execution order causing loops and repositioning of source document on contextMenuCommand
//
// click symbol -> onDidChangeTextEditorSelection
// context menu -> onDidChangeTextEditorSelection - contextMenuCommand - [onDidChangeTextDocument]
// edit text    -> [onDidChangeTextDocument] - onDidChangeTextEditorSelection
//
//              -> onDidChangeTextEditorSelection - contextMenuCommand - [onDidChangeTextDocument]
//                                                |_______delay________- posSourceSelTarget -> onDidChangeTextEditorSelection ...
//                                                                     |_______________________block__________________________|
//
