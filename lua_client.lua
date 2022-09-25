if BangBangSynapseLoaded then return end
if not game:IsLoaded() then
    game.Loaded:Wait()
end
local HttpService = game:GetService("HttpService")
local socket = (syn and syn.websocket or WebSocket).connect('ws://localhost:42439/')

socket.OnMessage:Connect(function(message)
    local data = HttpService:JSONDecode(message)
    local nonce = data.nonce

    --[[
        Message: get_networking
        Description: Gets all the networking stuff such as RemoteEvents and RemoteFunctions
    ]]
    if data.type == "get_networking" then
        local networking = {}
        for i,v in pairs(game:GetDescendants()) do
            if v:IsA("RemoteEvent") or v:IsA("RemoteFunction") then
                table.insert(networking, {
                    name = v:GetFullName(),
                    className = v.ClassName
                })
            end
        end

        socket:Send(HttpService:JSONEncode({
            nonce = nonce,
            type = "networking",
            data = networking
        }))
    end

    --[[
        Message: get_owned
        Description: Gets all the owned instances
    ]]
    if data.type == "get_owned" then
        local owned = {}
        for i,v in pairs(getinstances()) do
            if v:IsA("BasePart") and isnetworkowner(v) then
                table.insert(owned, {
                    name = v:GetFullName(),
                    className = v.ClassName
                })
            end
        end
        socket:Send(HttpService:JSONEncode({
            nonce = nonce,
            type = "owned",
            data = owned
        }))
    end

    --[[
        Message: decompile_script
        Arguments: script_path: string
        Description: Decompiles the script and sends it back
    ]]
    if data.type == "decompile_script" then
        local script_path = data.script_path
        local split = script_path:split(".")
        local script = game
        xpcall(function()
            for i,v in pairs(split) do
                script = script[v]
            end
            local decompiled = decompile(script)
            socket:Send(HttpService:JSONEncode({
                nonce = nonce,
                type = "decompiled_script",
                data = decompiled
            }))
        end, function(err)
            socket:Send(HttpService:JSONEncode({
                nonce = nonce,
                type = "decompiled_script",
                data = "--[[ Unabled to decompile : " .. err .. " ]]"
            }))
        end)
    end


    --[[
        Message: search
        Arguments: what : string, search_what: string
        Description: Search the game for what
    ]]
    if data.type == "search" then
        local ret = {}
        if data.what == "func_with_name" then
            local search_what = data.search_what:lower()
            for k, v in pairs(getgc()) do
                local info = debug.getinfo(v)
                local name = info.name or ""
                if name:lower():find(search_what) then
                    table.insert(ret, {name = name, source = info.source, what = "function", line = info.linedefined})
                end
            end
        end
        if data.what == "func_with_const" then
            local search_what = data.search_what:lower()
            for k, v in pairs(getgc()) do
                local info = debug.getinfo(v)
                if info.what == "Lua" then
                    local consts = debug.getconstants(v)
                    local added = false
                    for k,v in pairs(consts) do
                        pcall(function()
                            if v:lower():find(search_what) then
                                table.insert(ret, {name = info.name, source = info.source, what = "function", line = info.linedefined})
                                added = true
                            end
                        end)
                        if added then break end
                    end
                end
            end
        end
        socket:Send(HttpService:JSONEncode({
            type = "search_results",
            results = ret,
            nonce = nonce
        }))
    end

    --[[
        Message: check
        Arguments: script: string
        Description: Compile the given script but doesn't run it.
    ]]
    if data.type == "check" then
        local script = data.script
        local func = loadstring(script)
        if not func then
            socket:Send(HttpService:JSONEncode({
                type = "compilation_error",
                error = func,
                nonce = nonce
            }))
            return
        end
        socket:Send(HttpService:JSONEncode({
           type = "compilation_success",
           nonce = nonce
        }))
    end
    --[[
        Message: execute
        Arguments: script: string
        Description: Executes the given script
    ]]
    if data.type == "execute" then
        local script = data.script
        local func, cer = loadstring(script)
        if not func then
            socket:Send(HttpService:JSONEncode({
                type = "compilation_error",
                error = cer,
                nonce = nonce
            }))
            return
        end
        socket:Send(HttpService:JSONEncode({
           type = "compilation_success",
           nonce = nonce
        }))
        local success, err = pcall(func)
        if not success then
            socket:Send(HttpService:JSONEncode({
                type = "runtime_error",
                error = err,
                nonce = nonce
            }))
            return
        end
        socket:Send(HttpService:JSONEncode({
           type = "execution_success",
           nonce = nonce
        }))
    end
end)


game:GetService("LogService").MessageOut:Connect(function(message)
    socket:Send(HttpService:JSONEncode({
        type = "log_output",
        message = message
    }))
end)

local placeID = game.PlaceId
local placeName = game:GetService("MarketplaceService"):GetProductInfo(placeID).Name

local username = game.Players.LocalPlayer.Name

socket:Send(HttpService:JSONEncode({
    type = "connect",
    placeID = placeID,
    placeName = placeName,
    username = username
}))
BangBangSynapseLoaded = true
