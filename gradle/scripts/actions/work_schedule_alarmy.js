const axios = require("axios");

const notifySchedule = async (email, password, departmentId, slackUrl) => {
    console.log(email, password, departmentId)
    if (isWeekend()) return;

    const auth = await getAuth(email, password);
    const token = await getToken(auth);

    const users = await getUsers(token, departmentId);

    const userIdParam = users.map((user) => `userIdHashes=${user.id}`).join("&");
    const workSchedules = await getWorkSchedules(userIdParam, token);
    
    const userInfo = buildUserInfo(users, workSchedules);

    sendMessage(userInfo, slackUrl);
}

function isWeekend() {
    const day = new Date().getDay();
    return day === 0 || day === 6;
}

async function getAuthHeaders() {
    const challengeURL = "https://flex.team/api-public/v2/auth/challenge";
    const sessionId = await axios
        .post(challengeURL, {
            deviceInfo : { os: "web" },
            locationInfo: {}
        })
        .then(({ data }) => data.sessionId);

    return {
        headers: {
            cookie: `FlexTeam-Version=V2;FlexTeam-Locale=ko;`,
            "flexteam-v2-login-session-id": sessionId
        }
    }
}

async function login(email, password, headers) {
    const identifierURL = "https://flex.team/api-public/v2/auth/verification/identifier";
    await axios
        .post(
            identifierURL,
            { identifier: email },
            headers
        );

    const passwordURL = "https://flex.team/api-public/v2/auth/authentication/password";
    await axios
        .post(
            passwordURL,
            { password: password },
            headers
        );
}

async function getAuth(email, password) {
    const headers = await getAuthHeaders();

    await login(email, password, headers);

    const authorizationURL = "https://flex.team/api-public/v2/auth/authorization";
    return await axios
        .post(
            authorizationURL,
            {},
            headers
        )
        .then(({ data }) => data);
}

async function getToken(auth) {
    const headers = {
        headers: {
            cookie: `FlexTeam-Version=V2;FlexTeam-Locale=ko;`,
            "flexteam-v2-workspace-access": auth.v2Response.workspaceToken.accessToken.token
        }
    };

    const customerUserURL = "https://flex.team/api-public/v2/auth/tokens/customer-user";
    const customerUser = await axios
        .get(customerUserURL, headers)
        .then(({data}) => data[0]);


    const exchangeURL = "https://flex.team/api-public/v2/auth/tokens/customer-user/exchange";
    return await axios
        .post(exchangeURL, customerUser, headers)
        .then(({data}) => data.token);
}

async function getUsers(token, departmentId) {
    const searchUsersURL = "https://flex.team/action/v2/search/customers/5eB8q7gzKp/search-users";

    return await axios
        .post(
            searchUsersURL + "?size=50",
            {
                filter: {
                    departmentIdHashes: [departmentId],
                    userStatuses: [
                        "LEAVE_OF_ABSENCE",
                        "LEAVE_OF_ABSENCE_SCHEDULED",
                        "RESIGNATION_SCHEDULED",
                        "IN_EMPLOY",
                        "IN_APPRENTICESHIP",
                    ],
                },
            },
            { headers: { cookie: `AID=${token};` } }
        )
        .then(({ data }) =>
            data.list.map(({ user }) => ({
                id: user.userIdHash,
                name: user.name
            }))
        );
}

function getTodayStart() {
    const date = new Date();
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}

function getTomorrowStart() {
    const date = new Date();
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    date.setDate(date.getDate() + 1);
    return date;
}

async function getWorkSchedules(userIdParam, token) {
    const workSchedulesURL = "https://flex.team/api/v2/time-tracking/users/work-schedules?" + 
        `${userIdParam}&timeStampFrom=${getTodayStart().valueOf()}&timeStampTo=${getTomorrowStart().valueOf()}`;
    
    return await axios
        .get(
            workSchedulesURL,
            { headers: { cookie: `AID=${token};` } }
        )
        .then(({ data }) => {
            return data.workScheduleResults.map((schedule) => convertToUserSchedule(schedule));
        });
}

function convertToUserSchedule(schedule) {
    const dayIdx = new Date().getDay() - 1;
    const day = schedule.days[dayIdx]
    const records = day.workRecords;
    const startRecords = day.workStartRecords;

    const blockTimeFrom = records[0]?.blockTimeFrom?.timeStamp || startRecords[0]?.blockTimeFrom?.timeStamp;
    const blockTimeTo = records[records?.length - 1 || 0]?.blockTimeTo?.timeStamp

    return {
        userId: schedule.userIdHash,
        workType: records[records?.length -1 || 0]?.name || "휴가",
        from: blockTimeFrom != null ? getWorkTime(blockTimeFrom) : "",
        to: blockTimeTo != null ? getWorkTime(blockTimeTo) : ""
    };
}

function getWorkTime(timestamp) {
    return new Date(timestamp).toLocaleString(
        "ko-KR",
        { timeZone: "asia/seoul" }
    ).split(" ").pop();
}

function buildUserInfo(users, schedules) {
    const userInfo = users.reduce((acc, obj) => {
        acc[obj.id] = obj;
        return acc;
    }, {});

    schedules.forEach((schedule) => {
        userInfo[schedule.userId] = {
            ...userInfo[schedule.userId],
            ...schedule
        }
    });

    return userInfo;
}

function sendMessage(userInfo, slackUrl) {
    const header = "이름\t상태\t근무시간"
    const divider = "=================================="
    const message = Object.values(userInfo)
        .map((user) => `${user.name}\t${user.workType}\t${user.from} ~ ${user.to}`).join("\n");
    axios.post(
        slackUrl,
        {
            text: `${header}\n${divider}\n${message}`
        }
    );
}

const email = process.argv[2]
const password = process.argv[3]
const departmentId = process.argv[4]
const slackUrl = process.argv[5]
notifySchedule(email, password, departmentId, slackUrl);
