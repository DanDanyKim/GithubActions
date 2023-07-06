distributors=("김단희_개발" "김단희_개발")
distributor_sequence=$(cat ./distributor_sequence)

payload="{\"text\": \"이번 배포 담당자는 @${distributors[${distributor_sequence}]} 님 입니다\"}"

slack_reminder_webhook=$1
curl -X POST -H 'Content-type: application/json' --data "$payload" $slack_reminder_webhook

distributor_num=${#distributors[@]}
next_distributor_sequence=$(((distributor_sequence+1) % $distributor_num))
echo "$next_distributor_sequence" > ./distributor_sequence
