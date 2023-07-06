distributors=("김다슬" "김단희")
distributor_sequence=$(cat gradle/scripts/actions/distributor_sequence)
payload="{\"text\": \"이번 배포 담당자는 @${distributors[${distributor_sequence}]} 입니다\"}"
echo distributor : ${distributors[${distributor_sequence}]}
slack_reminder_webhook=$1
curl -X POST -H 'Content-type: application/json' --data "$payload" $slack_reminder_webhook
