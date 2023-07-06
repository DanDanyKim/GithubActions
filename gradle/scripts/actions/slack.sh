distributors=("김다슬" "김단희")
echo "distributor: ${distributors[0]}"
payload="{\"text\": \"이번 배포 담당자는 ${distributors[0]} 입니다\"}"
slack_reminder_webhook="https://hooks.slack.com/services/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"
curl -X POST -H 'Content-type: application/json' --data "$payload" $slack_reminder_webhook
