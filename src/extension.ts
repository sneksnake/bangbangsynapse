/* eslint-disable @typescript-eslint/naming-convention */

import * as vscode from 'vscode';
import * as WebSocket from 'ws';


const clientCode = "if BangBangSynapseLoaded then return end\n" +
"if not game:IsLoaded() then\n" +
"    game.Loaded:Wait()\n" +
"end\n" +
"local HttpService = game:GetService(\"HttpService\")\n" +
"local socket = (syn and syn.websocket or WebSocket).connect('ws://localhost:42439/')\n" +
"\n" +
"socket.OnMessage:Connect(function(message)\n" +
"    local data = HttpService:JSONDecode(message)\n" +
"    local nonce = data.nonce\n" +
"\n" +
"    if data.type == \"get_networking\" then\n" +
"        local networking = {}\n" +
"        for i,v in pairs(game:GetDescendants()) do\n" +
"            if v:IsA(\"RemoteEvent\") or v:IsA(\"RemoteFunction\") then\n" +
"                table.insert(networking, {\n" +
"                    name = v:GetFullName(),\n" +
"                    className = v.ClassName\n" +
"                })\n" +
"            end\n" +
"        end\n" +
"\n" +
"        socket:Send(HttpService:JSONEncode({\n" +
"            nonce = nonce,\n" +
"            type = \"networking\",\n" +
"            data = networking\n" +
"        }))\n" +
"    end\n" +
"\n" +
"    if data.type == \"get_owned\" then\n" +
"        local owned = {}\n" +
"        for i,v in pairs(getinstances()) do\n" +
"            if v:IsA(\"BasePart\") and isnetworkowner(v) then\n" +
"                table.insert(owned, {\n" +
"                    name = v:GetFullName(),\n" +
"                    className = v.ClassName\n" +
"                })\n" +
"            end\n" +
"        end\n" +
"        socket:Send(HttpService:JSONEncode({\n" +
"            nonce = nonce,\n" +
"            type = \"owned\",\n" +
"            data = owned\n" +
"        }))\n" +
"    end\n" +
"\n" +
"    if data.type == \"decompile_script\" then\n" +
"        local script_path = data.script_path\n" +
"        local split = script_path:split(\".\")\n" +
"        local script = game\n" +
"        xpcall(function()\n" +
"            for i,v in pairs(split) do\n" +
"                script = script[v]\n" +
"            end\n" +
"            local decompiled = decompile(script)\n" +
"            socket:Send(HttpService:JSONEncode({\n" +
"                nonce = nonce,\n" +
"                type = \"decompiled_script\",\n" +
"                data = decompiled\n" +
"            }))\n" +
"        end, function(err)\n" +
"            socket:Send(HttpService:JSONEncode({\n" +
"                nonce = nonce,\n" +
"                type = \"decompiled_script\",\n" +
"                data = \"--[[ Unabled to decompile : \" .. err .. \" ]]\"\n" +
"            }))\n" +
"        end)\n" +
"    end\n" +
"\n" +
"\n" +
"    if data.type == \"search\" then\n" +
"        local ret = {}\n" +
"        if data.what == \"func_with_name\" then\n" +
"            local search_what = data.search_what:lower()\n" +
"            for k, v in pairs(getgc()) do\n" +
"                local info = debug.getinfo(v)\n" +
"                local name = info.name or \"\"\n" +
"                if name:lower():find(search_what) then\n" +
"                    table.insert(ret, {name = name, source = info.source, what = \"function\", line = info.linedefined})\n" +
"                end\n" +
"            end\n" +
"        end\n" +
"        if data.what == \"func_with_const\" then\n" +
"            local search_what = data.search_what:lower()\n" +
"            for k, v in pairs(getgc()) do\n" +
"                local info = debug.getinfo(v)\n" +
"                if info.what == \"Lua\" then\n" +
"                    local consts = debug.getconstants(v)\n" +
"                    local added = false\n" +
"                    for k,v in pairs(consts) do\n" +
"                        pcall(function()\n" +
"                            if v:lower():find(search_what) then\n" +
"                                table.insert(ret, {name = info.name, source = info.source, what = \"function\", line = info.linedefined})\n" +
"                                added = true\n" +
"                            end\n" +
"                        end)\n" +
"                        if added then break end\n" +
"                    end\n" +
"                end\n" +
"            end\n" +
"        end\n" +
"        socket:Send(HttpService:JSONEncode({\n" +
"            type = \"search_results\",\n" +
"            results = ret,\n" +
"            nonce = nonce\n" +
"        }))\n" +
"    end\n" +
"\n" +
"    if data.type == \"check\" then\n" +
"        local script = data.script\n" +
"        local func = loadstring(script)\n" +
"        if not func then\n" +
"            socket:Send(HttpService:JSONEncode({\n" +
"                type = \"compilation_error\",\n" +
"                error = func,\n" +
"                nonce = nonce\n" +
"            }))\n" +
"            return\n" +
"        end\n" +
"        socket:Send(HttpService:JSONEncode({\n" +
"           type = \"compilation_success\",\n" +
"           nonce = nonce\n" +
"        }))\n" +
"    end\n" +
"    if data.type == \"execute\" then\n" +
"        local script = data.script\n" +
"        local func, cer = loadstring(script)\n" +
"        if not func then\n" +
"            socket:Send(HttpService:JSONEncode({\n" +
"                type = \"compilation_error\",\n" +
"                error = cer,\n" +
"                nonce = nonce\n" +
"            }))\n" +
"            return\n" +
"        end\n" +
"        socket:Send(HttpService:JSONEncode({\n" +
"           type = \"compilation_success\",\n" +
"           nonce = nonce\n" +
"        }))\n" +
"        local success, err = pcall(func)\n" +
"        if not success then\n" +
"            socket:Send(HttpService:JSONEncode({\n" +
"                type = \"runtime_error\",\n" +
"                error = err,\n" +
"                nonce = nonce\n" +
"            }))\n" +
"            return\n" +
"        end\n" +
"        socket:Send(HttpService:JSONEncode({\n" +
"           type = \"execution_success\",\n" +
"           nonce = nonce\n" +
"        }))\n" +
"    end\n" +
"end)\n" +
"\n" +
"\n" +
"game:GetService(\"LogService\").MessageOut:Connect(function(message)\n" +
"    socket:Send(HttpService:JSONEncode({\n" +
"        type = \"log_output\",\n" +
"        message = message\n" +
"    }))\n" +
"end)\n" +
"\n" +
"local placeID = game.PlaceId\n" +
"local placeName = game:GetService(\"MarketplaceService\"):GetProductInfo(placeID).Name\n" +
"\n" +
"local username = game.Players.LocalPlayer.Name\n" +
"\n" +
"socket:Send(HttpService:JSONEncode({\n" +
"    type = \"connect\",\n" +
"    placeID = placeID,\n" +
"    placeName = placeName,\n" +
"    username = username\n" +
"}))\n" +
"BangBangSynapseLoaded = true";

var logOutputChannel: vscode.OutputChannel;

var client: any = null;
var wss: any = null;

var executeWS: any = null;
var attachWS: any = null;

function beginSocketServer() {
	if (wss) {
		return;
	}
	wss = new WebSocket.Server({ port: 42439 });
	wss.on('connection', function connection(ws: WebSocket) {
		ws.on("close", function () {
			client = null;
			logOutputChannel.appendLine(`Client disconnected !`);
		});
		ws.on('message', function incoming(message: string) {
			var data = JSON.parse(message);
			if (data.type === "connect") {
				client = ws;
				logOutputChannel.appendLine(`Client connected from ${data.placeName} (${data.placeID}) as ${data.username}`);
			}

			if (data.type === "log_output") {
				logOutputChannel.appendLine(`${data.message}`);
			}

			if (data.type === "compilation_error") {
				logOutputChannel.appendLine(`Compilation error: ${data.error}`);
			}

			if (data.type === "runtime_error") {
				logOutputChannel.appendLine(`Runtime error: ${data.error}`);
			}

			if (data.type === "execution_success") {
			}

			if (data.type === "compilation_success") {
			}

			if (data.type === "search_results") {
				var results = "Search results:\n\n";
				for (var i = 0; i < data.results.length; i++) {
					results += `${data.results[i].name}:${data.results[i].line} - ${data.results[i].source}\n`;
				}

				vscode.workspace.openTextDocument({ content: results, language: "ini" }).then(doc => {
					vscode.window.showTextDocument(doc, { preview: false });
				});
			}

			if (data.type === "networking") {
				var results = "Remotes:\n\n";
				for (var i = 0; i < data.data.length; i++) {
					results += `${data.data[i].name} : ${data.data[i].className}\n`;
				}
				vscode.workspace.openTextDocument({ content: results, language: "ini" }).then(doc => {
					vscode.window.showTextDocument(doc, { preview: false });
				});
			}

			if (data.type === "owned") {
				var results = "Owned Instances:\n\n";
				for (var i = 0; i < data.data.length; i++) {
					results += `${data.data[i].name}\n`;
				}
				vscode.workspace.openTextDocument({ content: results, language: "ini" }).then(doc => {
					vscode.window.showTextDocument(doc, { preview: false });
				});
			}

			if (data.type === "decompiled_script") {
				vscode.workspace.openTextDocument({ content: data.data, language: "lua" }).then(doc => {
					vscode.window.showTextDocument(doc, { preview: false });
				});
			}

		});
	});
}

function stopSocketServer() {
	if (wss) {
		wss.close();
		wss = null;
	}
}

export function activate(context: vscode.ExtensionContext) {

	logOutputChannel = vscode.window.createOutputChannel("Roblox");
	beginSocketServer();

	// onCommand:bangbang-synapse.attach
	context.subscriptions.push(vscode.commands.registerCommand('bangbang-synapse.attach', () => {

		if (!attachWS || attachWS.readyState !== WebSocket.OPEN) {
			attachWS = new WebSocket("ws://localhost:24892/attach");
			attachWS.on("open", function () {
				logOutputChannel.appendLine(`[ATTACH] Connected to Synapse !`);
			});
			attachWS.on("close", function () {
				logOutputChannel.appendLine(`[ATTACH] Disconnected from Synapse !`);
			});
			attachWS.on("message", function (data: string) {
				logOutputChannel.appendLine(`[ATTACH] ${data}`);
			});
		}
		if (!executeWS || executeWS.readyState !== WebSocket.OPEN) {
			executeWS = new WebSocket("ws://localhost:24892/execute");
			executeWS.on("open", function () {
				logOutputChannel.appendLine(`[EXECUTE] Connected to Synapse !`);
			});
			executeWS.on("close", function () {
				logOutputChannel.appendLine(`[EXECUTE] Disconnected from Synapse !`);
			});
			executeWS.on("message", function (data: string) {
				logOutputChannel.appendLine(`[EXECUTE] ${data}`);
			});
		}

		// when attach is ready or if it's already ready
		if (attachWS.readyState === WebSocket.OPEN) {
			attachWS.send('ATTACH');
		} else {
			attachWS.on("open", function () {
				attachWS.send('ATTACH');
			});
		}

		// when execute is ready or if it's already ready
		if (executeWS.readyState === WebSocket.OPEN) {
			executeWS.send(clientCode);
		} else {
			executeWS.on("open", function () {
				// send the content of lua_client.lua
				executeWS.send(clientCode);
			});
		}

	}));

	// bangbang-synapse.getNetworking
	context.subscriptions.push(vscode.commands.registerCommand('bangbang-synapse.getNetworking', () => {
		if (client) {
			client.send(JSON.stringify({ type: "get_networking" }));
		}
	}));

	// bangbang-synapse.getOwned
	context.subscriptions.push(vscode.commands.registerCommand('bangbang-synapse.getOwned', () => {
		if (client) {
			client.send(JSON.stringify({ type: "get_owned" }));
		}
	}));

	// bangbang-synapse.decompileScript
	context.subscriptions.push(vscode.commands.registerCommand('bangbang-synapse.decompileScript', async () => {
		if (client) {
			var path = await vscode.window.showInputBox({ prompt: "Path of the script" });
			client.send(JSON.stringify({ type: "decompile_script", script_path: path }));
		}
	}));


	// bangbang-synapse.searchFuncWithName
	context.subscriptions.push(vscode.commands.registerCommand('bangbang-synapse.searchFuncWithName', async () => {
		if (client) {
			var funcName = await vscode.window.showInputBox({ prompt: "Function name" });
			client.send(JSON.stringify({ type: "search", what: "func_with_name", search_what: funcName }));
		} else {
			logOutputChannel.appendLine(`Client not connected !`);
		}
	}));

	// bangbang-synapse.searchFuncWithConst
	context.subscriptions.push(vscode.commands.registerCommand('bangbang-synapse.searchFuncWithConst', async () => {
		if (client) {
			var constName = await vscode.window.showInputBox({ prompt: "Constant" });
			client.send(JSON.stringify({ type: "search", what: "func_with_const", search_what: constName }));
		} else {
			logOutputChannel.appendLine(`Client not connected !`);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('bangbang-synapse.executeCode', () => {
		// get current editor
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		// get code in that editor
		const code = editor.document.getText();
		// send code to socket server
		if (client) {
			client.send(JSON.stringify({ type: "execute", script: code }));
		} else {
			logOutputChannel.appendLine("No client connected !");
		}


	}));
}

export function deactivate() {
	stopSocketServer();
	logOutputChannel.dispose();

	if (attachWS) {
		attachWS.close();
	}
	if (executeWS) {
		executeWS.close();
	}

}
