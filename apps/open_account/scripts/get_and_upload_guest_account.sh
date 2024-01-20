#!/bin/bash
# Thanks https://diygod.cc/10k-twitter-accounts
## apt install curl jq

key='<SECRET_TOKEN>'
endpoint='https://example.prefix.workers.dev/upload/account'

count=0

for ((i = 1; i <= 200; i++)); do
    guest_token=$(curl -s -XPOST https://api.twitter.com/1.1/guest/activate.json -H 'Authorization: Bearer AAAAAAAAAAAAAAAAAAAAAFXzAwAAAAAAMHCxpeSDG1gLNLghVe8d74hl6k4%3DRUMF4xAQLsbeBhTSRrCiQpJtxoGWeyHrDb5te2jpGskWDFW82F' | jq -r '.guest_token')
    flow_token=$(curl -s -XPOST 'https://api.twitter.com/1.1/onboarding/task.json?flow_name=welcome' \
        -H 'Authorization: Bearer AAAAAAAAAAAAAAAAAAAAAFXzAwAAAAAAMHCxpeSDG1gLNLghVe8d74hl6k4%3DRUMF4xAQLsbeBhTSRrCiQpJtxoGWeyHrDb5te2jpGskWDFW82F' \
        -H 'Content-Type: application/json' \
        -H "User-Agent: TwitterAndroid/10.21.0-release.0" \
        -H "X-Guest-Token: ${guest_token}" \
        -d '{"flow_token":null,"input_flow_data":{"flow_context":{"start_location":{"location":"splash_screen"}}}}' | jq -r .flow_token)
    task=$(curl -s -XPOST 'https://api.twitter.com/1.1/onboarding/task.json' \
        -H 'Authorization: Bearer AAAAAAAAAAAAAAAAAAAAAFXzAwAAAAAAMHCxpeSDG1gLNLghVe8d74hl6k4%3DRUMF4xAQLsbeBhTSRrCiQpJtxoGWeyHrDb5te2jpGskWDFW82F' \
        -H 'Content-Type: application/json' \
        -H "User-Agent: TwitterAndroid/10.21.0-release.0" \
        -H "X-Guest-Token: ${guest_token}" \
        -d "{\"flow_token\":\"${flow_token}\",\"subtask_inputs\":[{\"open_link\":{\"link\":\"next_link\"},\"subtask_id\":\"NextTaskOpenLink\"}]}")
    #echo $task
    open_account=$(echo $task | jq -c -r '.subtasks[0]|if(.open_account) then .open_account else empty end')
    if [ -z "$open_account" ]; then
        echo 'total='$count'; break'
        break
    else
        #echo 'key='$key'&account='$open_account
        echo $open_account >>guest_accounts.jsonl
        open_account=$(echo $open_account | jq -Rr @uri)
        upload=$(curl -s -XPOST $endpoint -H 'Content-Type: application/x-www-form-urlencoded' -d 'key='$key'&account='$open_account)
        echo $upload
        ((count++))
        echo 'count='$count
    fi
done
