const express = require('express');
require('dotenv').config(); 
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors'); 
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const config = require('./config');
const cookieParser = require('cookie-parser');

const port = 3000;

// --- 1. 사주 데이터 내장 (제공된 PDF 기반) ---
const CELESTIAL_STEMS = { // 천간 데이터
    "甲(갑)": { "오행": "목(木)", "의미": "큰 나무", "키워드": "리더십, 성장, 추진력" },
    "乙(을)": { "오행": "목(木)", "의미": "덩굴", "키워드": "유연함, 배려, 협력적" },
    "丙(병)": { "오행": "화(火)", "의미": "태양", "키워드": "열정, 낙천적, 외향적" },
    "丁(정)": { "오행": "화(火)", "의미": "촛불", "키워드": "따뜻함, 섬세함, 감성적" },
    "戊(무)": { "오행": "토(土)", "의미": "산, 대지", "키워드": "신뢰, 현실적, 안정적" },
    "己(기)": { "오행": "토(土)", "의미": "밭, 흙", "키워드": "사려깊음, 관리형, 세심함" },
    "庚(경)": { "오행": "금(金)", "의미": "쇠, 칼", "키워드": "결단력, 분석력, 단호함" },
    "辛(신)": { "오행": "금(金)", "의미": "보석", "키워드": "세련됨, 완벽주의, 신중함" },
    "壬(임)": { "오행": "수(水)", "의미": "큰 바다", "키워드": "포용력, 관대함, 유연성" },
    "癸(계)": { "오행": "수(水)", "의미": "이슬", "키워드": "감수성, 섬세함, 통찰력" }
};
const EARTHLY_BRANCHES = { // 지지 데이터 (현재 사용하지 않음)
    "자(子)": { "오행": "수(水)", "동물": "쥐", "계절": "겨울", "키워드": "지혜, 시작, 계획" }, "축(丑)": { "오행": "토(土)", "동물": "소", "계절": "겨울의 끝", "키워드": "인내, 준비, 안정" },
    "인(寅)": { "오행": "목(木)", "동물": "호랑이", "계절": "봄", "키워드": "도전, 용기, 추진력" }, "묘(卯)": { "오행": "목(木)", "동물": "토끼", "계절": "봄", "키워드": "조화, 감성, 유연함" },
    "진(辰)": { "오행": "토(土)", "동물": "용", "계절": "봄의 끝", "키워드": "변화, 잠재력, 비전" }, "사(巳)": { "오행": "화(火)", "동물": "뱀", "계절": "여름", "키워드": "지혜, 직관, 감정표현" },
    "오(午)": { "오행": "화(火)", "동물": "말", "계절": "여름", "키워드": "활력, 성공, 표현력" }, "미(未)": { "오행": "토(土)", "동물": "양", "계절": "여름의 끝", "키워드": "안정, 배려, 균형" },
    "신(申)": { "오행": "금(金)", "동물": "원숭이", "계절": "가을", "키워드": "재치, 판단, 전략" }, "유(酉)": { "오행": "금(金)", "동물": "닭", "계절": "가을", "키워드": "정리, 완성, 표현" },
    "술(戌)": { "오행": "토(土)", "동물": "개", "계절": "가을의 끝", "키워드": "충성, 현실, 보호" }, "해(亥)": { "오행": "수(水)", "동물": "돼지", "계절": "겨울", "키워드": "감정, 포용, 직관" }
};
const SIXTY_CYCLES = [ // 60갑자 데이터 (일진 계산용으로 12개만 사용)
    { stem: "甲(갑)", branch: "子(자)", meaning: "새로운 시작, 지혜와 추진력의 조화", 오행: { stem: "목(木)", branch: "수(水)" } }, { stem: "乙(을)", branch: "丑(축)", meaning: "인내와 계획, 준비의 시기", 오행: { stem: "목(木)", branch: "토(土)" } },
    { stem: "丙(병)", branch: "寅(인)", meaning: "리더십, 도전, 창조의 힘", 오행: { stem: "화(火)", branch: "목(木)" } }, { stem: "丁(정)", branch: "卯(묘)", meaning: "감성, 표현, 인간관계의 조화", 오행: { stem: "화(火)", branch: "목(木)" } },
    { stem: "戊(무)", branch: "辰(진)", meaning: "현실감, 안정, 성취의 기반", 오행: { stem: "토(土)", branch: "토(土)" } }, { stem: "己(기)", branch: "巳(사)", meaning: "지혜와 집중, 내면의 성장", 오행: { stem: "토(土)", branch: "화(火)" } },
    { stem: "庚(경)", branch: "午(오)", meaning: "활력, 명예, 강한 존재감", 오행: { stem: "금(金)", branch: "화(火)" } }, { stem: "辛(신)", branch: "未(미)", meaning: "안정, 감성, 관계의 균형", 오행: { stem: "금(金)", branch: "토(土)" } },
    { stem: "壬(임)", branch: "申(신)", meaning: "직관, 판단력, 지혜의 날", 오행: { stem: "수(水)", branch: "금(金)" } }, { stem: "癸(계)", branch: "酉(유)", meaning: "내면적 통찰, 세련됨, 정리", 오행: { stem: "수(水)", branch: "금(金)" } },
    { stem: "甲(갑)", branch: "戌(술)", meaning: "정의감, 책임, 현실적 리더", 오행: { stem: "목(木)", branch: "토(土)" } }, { stem: "乙(을)", branch: "亥(해)", meaning: "포용력, 공감, 따뜻한 마음", 오행: { stem: "목(木)", branch: "수(水)" } }
];
const WUXING_RELATIONS = { // 오행 상생/상극 관계
    "목(木)": { "화(火)": "상생(활동)", "토(土)": "극함(통제)", "금(金)": "극받음(압박)", "수(水)": "상생(지원)" },
    "화(火)": { "목(木)": "상생(에너지)", "토(土)": "상생(성과)", "금(金)": "극함(도전)", "수(水)": "극받음(조절)" },
    "토(土)": { "목(木)": "극받음(부담)", "화(火)": "상생(창조)", "금(金)": "상생(기반)", "수(水)": "극함(제어)" },
    "금(金)": { "목(木)": "극함(단호함)", "화(火)": "극받음(변화)", "토(土)": "상생(안정)", "수(水)": "상생(통찰)" },
    "수(水)": { "목(木)": "상생(지원)", "화(火)": "극함(감정)", "토(土)": "극받음(장애)", "금(金)": "상생(지혜)" }
};


// --- 3. 헬퍼 함수 (사주 일진 계산) ---
function get_stem_by_day(dateString) {
    if (!dateString) return "甲(갑)";
    const date = new Date(dateString);
    const day = date.getDate();
    const cycleIndex = (day - 1) % SIXTY_CYCLES.length; 
    return SIXTY_CYCLES[cycleIndex].stem;
}
function get_daily_cycle(dateString) {
    if (!dateString) return SIXTY_CYCLES[0];
    const date = new Date(dateString);
    const day = date.getDate();
    const cycleIndex = (day - 1) % SIXTY_CYCLES.length; 
    return SIXTY_CYCLES[cycleIndex];
}

// --- 새로운 헬퍼 함수 (오늘의 구글 캘린더 일정 조회) ---
async function getTodaysEvents(tokens) {
    if (!tokens) return null;

    try {
        const oauth2Client = new OAuth2Client(
            config.google.client_id,
            config.google.client_secret,
            config.google.redirect_uri
        );
        oauth2Client.setCredentials(tokens);

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: todayStart.toISOString(),
            timeMax: todayEnd.toISOString(),
            maxResults: 10, // 하루 최대 10개 일정
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items;
        if (!events || events.length === 0) {
            return '오늘은 예정된 일정이 없습니다.';
        }

        // AI가 이해하기 쉽게 일정 목록을 텍스트로 변환
        return events.map(event => {
            const start = event.start.dateTime || event.start.date; // 종일 일정 처리
            return `- ${event.summary} (시작: ${new Date(start).toLocaleTimeString('ko-KR')})`;
        }).join('\n');

    } catch (error) {
        console.error('⚠️ 구글 캘린더 일정 조회 중 오류:', error.message);
        return null; // 오류 발생 시 null 반환
    }
}

// --- 4. 초기화 및 설정 ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) { console.error("❌ 오류: .env 파일에 GEMINI_API_KEY가 설정되지 않았습니다. 서버를 종료합니다."); process.exit(1); }
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const app = express();

// --- 5. 미들웨어 설정 ---
app.use(express.json()); 
app.use(express.static('public')); 
app.use(cors()); 
app.use(cookieParser()); // 쿠키 파서 미들웨어 추가


// --- 6. 핵심: API 통신 엔드포인트 ---
// server.js 파일 내, app.post('/generate-fortune', ...) 함수 전체를 이 코드로 교체

app.post('/generate-fortune', async (req, res) => {
    try {
        const { job, loveStatus, birthDate, birthTime, gender, tone, monthlyGoals } = req.body; 
        
        // --- 캘린더 연동 확인 및 일정 조회 ---
        let calendarContext = '';
        const tokensCookie = req.cookies.google_calendar_tokens;
        if (tokensCookie) {
            try {
                const tokens = JSON.parse(tokensCookie);
                const eventsText = await getTodaysEvents(tokens);
                if (eventsText) {
                    calendarContext = `\n3. **오늘의 주요 일정**:\n${eventsText}`;
                }
            } catch (e) { console.error('캘린더 토큰 파싱 오류', e); }
        }
        // --- 1. 사주 데이터 추출 (기존 유지) ---
        const userDayStemKey = get_stem_by_day(birthDate);
        const dayStemData = CELESTIAL_STEMS[userDayStemKey] || {};
        const todayCycle = get_daily_cycle(birthDate);
        const dayStemOheng = dayStemData.오행;
        const todayCycleOheng = todayCycle.오행.branch; 
        const relationType = WUXING_RELATIONS[dayStemOheng] ? (WUXING_RELATIONS[dayStemOheng][todayCycleOheng] || '동일(균형)') : '정보 없음';
        const goalsList = monthlyGoals.join(' / ');

        // --- 2. LLM 프롬프트 구성 (길이 및 응답 형식 강화) ---
        const finalPrompt = 
            `당신은 '포춘쿠키 가챠' 서비스의 전문 컨설턴트입니다. 사용자 만족도와 공감(GPT-4o 스타일)을 최우선으로 하며, 반드시 **[${tone}] 말투**와 **적절한 이모티콘**을 사용합니다.
            
            1. **사용자 사주 기반**: 일주 천간: ${userDayStemKey} (${dayStemData.오행}, ${dayStemData.키워드}). 연애상태: ${loveStatus}. 직업: ${job}.
            2. **오늘의 운세 기운**: 일진: ${todayCycle.stem}${todayCycle.branch} (${todayCycle.meaning}). 관계: 일주(${dayStemOheng})와 지지(${todayCycleOheng})는 **${relationType}** 관계입니다.${calendarContext}
            4. **사용자 목표**: 금월 목표 3가지: [${goalsList}]
            
            5. **목표**: 위 모든 정보(특히 오늘의 일정)를 종합하여, 사용자의 목표 달성에 도움이 되는 '공감과 인정'이 담긴 실용적인 행동 조언을 제공합니다.
            
            6. **결과물 요구 사항**:
               - 운세 점수(score)를 1~100점 사이로 산정합니다.
               - 운세 풀이(fortune)는 **반드시 3줄 분량**으로 요약하고, 상세 내용은 조언(advice)에 포함합니다.
               - 행운의 색깔, 숫자, 물건은 **사용자 데이터에 기반하여** 구체적으로 제시해야 합니다.
            7. **반환 형식**: 불필요한 서론 없이, 다음 JSON 객체만 반환하세요.
            {
                "fortune": "[개인화된 운세 풀이 3줄]", 
                "advice": "[사용자 목표를 위한 구체적인 행동 지침 1~2문장]",
                "luckyColor": "[행운의 색깔]",
                "luckyNumber": [행운의 숫자 (숫자형)],
                "luckyItem": "[행운의 물건]",
                "score": [1에서 100 사이의 운세 점수 (숫자형)] 
            }`;

        // --- LLM API 호출 및 응답 처리 ---
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: finalPrompt, 
            generationConfig: {
                responseMimeType: "application/json", // JSON 형식 강제 요청
                responseSchema: {
                    type: "OBJECT",
                    properties: { /* ... (스키마 정의는 유지) ... */ } 
                }
            }
        });
        
        // 3. JSON 파싱 시도 (가장 중요한 부분: 오류 유발 요인 제거)
        const responseText = response.text.replace(/```json|```/g, '').trim();
        const finalData = JSON.parse(responseText); 
        
        res.json(finalData); // 최종 데이터 반환 (실패 시 catch로 이동)

    } catch (error) {
        console.error('❌ LLM 호출 중 심각한 오류 발생 (JSON/API 오류):', error.message);
        
        // 4. 실패 시, 점수와 행운 요소를 0~100 사이의 '랜덤' 값으로 대체하여 '특별 운세' 표시
        const fallbackScore = Math.floor(Math.random() * 20) + 70; // 70~90점 사이
        const fallbackItems = ['편안한 의자', '휴식 시간', '친구와의 대화', '따뜻한 차'];
        
        res.status(500).json({ 
            fortune: `🎉 오늘은 AI가 당신의 에너지를 보호하기 위해 **[특별한 운세]**를 준비했어요! 운세 점수는 **[잠시 보류]**되었습니다.`,
            advice: '운이 풀리는 내일을 위해 오늘은 편안한 휴식을 취하고 에너지를 충전하세요.',
            luckyColor: ['흰색', '노란색', '파란색'][Math.floor(Math.random() * 3)],
            luckyNumber: Math.floor(Math.random() * 9) + 1,
            luckyItem: fallbackItems[Math.floor(Math.random() * fallbackItems.length)],
            score: fallbackScore 
        });
    }
});

// --- 7. 상세 분석: 두 번째 API 통신 엔드포인트 ---
app.post('/generate-detailed-analysis', async (req, res) => {
    try {
        const { userData, goal } = req.body;
        
        // *참고: 실제 사주 데이터 재활용 (첫 번째 호출과 동일)*
        const userDayStemKey = get_stem_by_day(userData.birthDate);
        const dayStemData = CELESTIAL_STEMS[userDayStemKey] || {};
        const todayCycle = get_daily_cycle(userData.birthDate);
        const dayStemOheng = dayStemData.오행;
        const todayCycleOheng = todayCycle.오행.branch; 
        const relationType = WUXING_RELATIONS[dayStemOheng] ? (WUXING_RELATIONS[dayStemOheng][todayCycleOheng] || '동일(균형)') : '정보 없음';

        const goalsList = userData.monthlyGoals.join(' / ');
        const initialAdvice = req.body.initialAdvice; // 첫 번째 호출의 조언을 재활용

        const finalPrompt = 
            `당신은 사용자의 **[${goal}]** 목표 달성을 위한 전문 심화 컨설턴트입니다. **[${userData.tone}] 말투**를 사용하며, 목표와 운세 기운을 깊이 연관 지어 **구체적인 3~4줄 분량의 실용적인 액션 플랜**을 제공하세요.
            
            1. **사용자 맥락**: 일주 천간: ${userDayStemKey} (${dayStemData.오행}, ${dayStemData.키워드}). 연애상태: ${userData.loveStatus}. 직업: ${userData.job}.
            2. **오늘의 기운**: 일진: ${todayCycle.stem}${todayCycle.branch}. 기운 관계: ${dayStemOheng}와 ${todayCycleOheng}는 **${relationType}** 관계.
            3. **핵심 목표**: **[${goal}]**
            4. 
            5. **결과물 요구 사항**:
               - 목표를 이루기 위해 오늘 당장 실천할 수 있는 **구체적인 행동 조언** 2~3가지를 포함하세요.
               - 모든 내용은 **한국어**로 작성하며, **이모티콘**을 적절히 사용하여 친밀감을 높이세요.
               
            6. **반환 형식**: 불필요한 서론 없이, 다음 JSON 객체만 반환하세요.
            {
                "detailedAnalysis": "[${goal}] 목표에 대한 심층적인 운세 해석과 실천 가능한 액션 플랜 3~4줄" 
            }`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: finalPrompt, 
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: { "detailedAnalysis": { "type": "STRING" } }
                }
            }
        });
        
        const responseText = response.text.replace(/```json|```/g, '').trim();
        const finalData = JSON.parse(responseText); 
        
        res.json(finalData); 

    } catch (error) {
        console.error(`❌ 상세 분석 API 호출 중 오류 발생 (${req.body.goal}):`, error);
        // 오류 시에도 프론트엔드가 멈추지 않도록 기본 메시지를 반환합니다.
        res.status(500).json({ 
            detailedAnalysis: `⚠️ ${req.body.goal} 영역 상세 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.`
        });
    }
});


// Google Calendar 인증 라우트
app.get('/auth/google', (req, res) => {
    const oauth2Client = new OAuth2Client(
        config.google.client_id,
        config.google.client_secret,
        config.google.redirect_uri
    );

    // 디버그: config와 환경변수 값을 로그로 확인
    console.log('[DEBUG] config.google.client_id =', config.google.client_id);
    console.log('[DEBUG] process.env.GOOGLE_CLIENT_ID =', process.env.GOOGLE_CLIENT_ID);

    // 요청 시 refresh token을 확실히 받기 위해 prompt:'consent' 사용
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: config.google.scopes,
        prompt: 'consent',
        include_granted_scopes: true
    });

    // 디버그용: 실제로 생성되는 인증 URL을 로그에 남겨 확인할 수 있게 합니다.
    console.log('[DEBUG] OAuth URL:', url);
    res.redirect(url);
});

// Google Calendar 콜백 처리
app.get('/auth/google/callback', async (req, res) => {
    const code = req.query.code;
    
    try {
        const oauth2Client = new OAuth2Client(
            config.google.client_id,
            config.google.client_secret,
            config.google.redirect_uri
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // 실제로는 DB/세션에 저장하는 것이 안전합니다.
        // 간단한 MVP 용도로 전체 tokens 객체를 httpOnly 쿠키에 저장합니다.
        res.cookie('google_calendar_tokens', JSON.stringify(tokens), {
            httpOnly: true,
            // 로컬 개발에서는 secure: false (https 아닌 경우), 배포 시 secure: true로 변경하세요
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30일
        });

        res.redirect('/');
    } catch (error) {
        console.error('Error getting OAuth tokens:', error);
        res.status(500).send('Authentication failed');
    }
});

// 캘린더 이벤트 생성 API
app.post('/api/calendar/event', async (req, res) => {
    const { summary, description, date } = req.body;
    const tokensCookie = req.cookies.google_calendar_tokens;

    if (!tokensCookie) {
        return res.status(401).json({ error: 'Not authenticated with Google Calendar' });
    }

    let tokens;
    try {
        tokens = JSON.parse(tokensCookie);
    } catch (err) {
        return res.status(401).json({ error: 'Invalid auth token format' });
    }

    try {
        const oauth2Client = new OAuth2Client();
        // tokens may contain access_token and refresh_token
        oauth2Client.setCredentials(tokens);

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
            summary,
            description,
            start: {
                dateTime: date,
                timeZone: 'Asia/Seoul',
            },
            end: {
                dateTime: new Date(new Date(date).getTime() + 60 * 60 * 1000).toISOString(), // 1시간 후
                timeZone: 'Asia/Seoul',
            },
        };

        const result = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });

        res.json({ success: true, event: result.data });
    } catch (error) {
        console.error('Error creating calendar event:', error);
        res.status(500).json({ error: 'Failed to create calendar event' });
    }
});

// 캘린더 연동 상태 확인 API (프론트엔드가 httpOnly 쿠키 환경에서 상태를 확인할 수 있도록)
app.get('/api/calendar/status', (req, res) => {
    const tokensCookie = req.cookies && req.cookies.google_calendar_tokens;
    if (!tokensCookie) return res.json({ connected: false });
    try {
        const tokens = JSON.parse(tokensCookie);
        // 간단한 검증: access_token 또는 refresh_token 존재 여부
        const connected = !!(tokens && (tokens.access_token || tokens.refresh_token));
        return res.json({ connected });
    } catch (err) {
        return res.json({ connected: false });
    }
});

// --- 8. 서버 구동 --- // 
const PORT = process.env.PORT || port; 
app.listen(PORT, () => {
    console.log(`✅ 서버가 성공적으로 실행되었습니다.`);
    console.log(`프론트엔드 접속 주소: http://localhost:${PORT}`);
});