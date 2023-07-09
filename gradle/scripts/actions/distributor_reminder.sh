name: App Distributor Reminder

on:
  schedule:
    - cron: "0 8 * * THU"

jobs:
  remind:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: run slack reminder
        run: |
          chmod +x ./gradle/scripts/actions/distributor_reminder.sh
            ./gradle/scripts/actions/distributor_reminder.sh ${{ vars.DISTRIBUTORS }} ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: commit changes
        run: |
          currentBranch=$(git branch --show-current)
          git pull origin ${currentBranch}

          git config --global user.name "actions"
          git config --global user.email "actions@hwahae.kr"

          git add -A
          git commit -m "update next distributor"
          git push
