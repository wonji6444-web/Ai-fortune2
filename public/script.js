// public/script.js

// --- 전역 변수 ---
const USER_DATA_KEY = 'saju_user_data';
let selectedInterests = [];
const MAX_INTERESTS = 3;


// --- 1. 화면 전환 및 초기 로드 ---

function showOnboarding(isEditMode = false) {
    // HOME 화면 숨기기, 온보딩 화면 표시
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('onboardingScreen').classList.remove('hidden');
    
    
}

function showHome(userData) {
    // 온보딩 화면 숨기기, HOME 화면 표시
    document.getElementById('onboardingScreen').classList.add('hidden');
    document.getElementById('homeScreen').classList.remove('hidden');
    
    // 사용자 이름(OOO님) 표시 (임시)
    document.getElementById('homeHeader').innerHTML = `👋 **${userData.gender === '남성' ? 'OOO님' : '님'}**, 오늘의 운세입니다.`;
}

// Local Storage에서 사용자 정보를 로드
function loadUserData() {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
}

// 입력 폼에 저장된 데이터를 채우는 함수 (정보 수정 시 사용)
function fillInputForm(data) {
    document.getElementById('jobInput').value = data.job || '';
    document.getElementById('loveStatus').value = data.loveStatus || '싱글(솔로)';
    document.getElementById('birthDate').value = data.birthDate || '';
    document.getElementById('birthTime').value = data.birthTime || '';
    document.getElementById('genderSelect').value = data.gender || '남성';
    document.getElementById('toneSelect').value = data.tone || '따뜻한 조언가의 말투 (존댓말, 쿠션어)';
    
    // 관심사 버튼 초기화 및 선택 상태 반영
    selectedInterests = data.monthlyGoals || [];
    const buttons = document.querySelectorAll('#interestOptions .interest-btn');
    buttons.forEach(btn => {
        const interest = btn.getAttribute('data-interest');
        if (selectedInterests.includes(interest)) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    document.getElementById('interestCount').textContent = `${selectedInterests.length}/${MAX_INTERESTS}개 선택됨`;
}

document.addEventListener('DOMContentLoaded', () => {
    const savedData = loadUserData();
    if (savedData) {
        // 저장된 데이터가 있으면 HOME 화면을 먼저 보여줍니다.
        showHome(savedData);
        fillInputForm(savedData);
    } else {
        // 데이터가 없으면 온보딩 화면을 보여줍니다.
        showOnboarding();
    }
    
    // 관심사 핸들러 연결 (DOMContentLoaded 내에서 연결해야 안전합니다)
    const optionsContainer = document.getElementById('interestOptions');
    optionsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('interest-btn')) {
            toggleInterestSelection(e.target);
        }
    });
});


// --- 2. 관심사 및 데이터 저장 핸들러 ---

function toggleInterestSelection(button) {
    const interest = button.getAttribute('data-interest');
    const index = selectedInterests.indexOf(interest);

    if (index > -1) {
        selectedInterests.splice(index, 1);
        button.classList.remove('selected');
    } else if (selectedInterests.length < MAX_INTERESTS) {
        selectedInterests.push(interest);
        button.classList.add('selected');
    } else {
        alert(`목표는 최대 ${MAX_INTERESTS}개까지만 선택할 수 있습니다.`);
        return;
    }
    document.getElementById('interestCount').textContent = `${selectedInterests.length}/${MAX_INTERESTS}개 선택됨`;
}

// 온보딩/수정 버튼 클릭 시 호출
function saveAndGenerate() {
    const job = document.getElementById('jobInput').value;
    const loveStatus = document.getElementById('loveStatus').value;
    const birthDate = document.getElementById('birthDate').value;
    const birthTime = document.getElementById('birthTime').value;
    const gender = document.getElementById('genderSelect').value;
    const tone = document.getElementById('toneSelect').value;
    const monthlyGoals = selectedInterests; 

    if (!birthDate || !birthTime || monthlyGoals.length === 0) {
        alert("생년월일과 태어난 시각, 목표 3개를 모두 입력/선택해 주세요.");
        return;
    }

    // Local Storage에 사용자 정보 저장
    const userData = { job, loveStatus, birthDate, birthTime, gender, tone, monthlyGoals };
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    
    showHome(userData); // HOME 화면으로 전환
    checkAndDisplayFortune(); // 운세 바로 확인 시작
}


// --- 3. 운세 생성 및 표시 로직 ---

// HOME 화면에서 '오늘의 운세 바로 확인' 버튼 클릭 시 사용
function checkAndDisplayFortune() {
    const userData = loadUserData();
    if (!userData) {
        showOnboarding();
        return;
    }

    const resultDiv = document.getElementById('homeResult');

    // 로딩 상태 표시
    let dots = 0;
    const loadingMessageEl = document.getElementById('loadingMessage');
    document.getElementById('loadingOverlay').style.display = 'block';

    const interval = setInterval(() => {
        dots = (dots % 4) + 1;
        loadingMessageEl.textContent = `핵심 기운 분석 및 운세 재해석 중` + '.'.repeat(dots);
    }, 500);

    // 3. 서버에 POST 요청 시작
    fetch('/generate-fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData) // 저장된 데이터로 운세 생성
    })
    .then(response => response.json()) 
    .then(data => {
        clearInterval(interval);
        document.getElementById('loadingOverlay').style.display = 'none';

        if (data && data.fortune && data.score !== undefined) {
            displayFinalFortune(data, resultDiv);
            createInterestTabs(data); // 탭 생성
        } else {
            resultDiv.innerHTML = `<div class="result-card bg-red-100">⚠️ AI 응답 오류. 콘솔 확인.</div>`;
        }
   // public/script.js 파일 내, checkAndDisplayFortune 함수 끝 부분 수정

    })
    .catch(error => {
        clearInterval(interval);
        document.getElementById('loadingOverlay').style.display = 'none';
        
        // ✨ 오류 발생 시에도 사용자에게는 부드러운 메시지를 표시합니다.
        resultDiv.innerHTML = `<div class="result-card bg-red-100 p-4">
            ❌ **시스템 점검 중입니다.** 잠시 후 다시 운세를 뽑아주세요!
        </div>`;
        console.error('Fetch Error:', error); // 개발자 콘솔에만 기록
    });
}


// ... (이전 코드)

// 4. 최종 결과 HTML 구성 및 탭 생성
// ------------------------------------

function displayFinalFortune(data, targetDiv) {
    const score = parseInt(data.score); 
    const percentile = 100 - score; 
    const fortuneText = data.fortune.replace(/\n/g, '<br>');
    
    // 1. 메인 결과 카드 구성 (가챠 결과)
    targetDiv.innerHTML = `
        <div class="text-center p-6 bg-yellow-100 border-4 border-[#ffc400] rounded-xl">
            <p class="text-4xl font-extrabold text-[#4b380a] mb-2">
                🎉 나의 운세는 상위 ${percentile}%!
            </p>
            <p class="text-xl font-semibold text-[#9c27b0] mb-4">
                종합 운세 점수: ${score}점
            </p>
            <p class="text-gray-700 font-medium">${fortuneText}</p>
            
            <hr class="my-4 border-[#ffc400]">

            <p id="initialAdviceText" class="text-gray-800 text-lg font-bold">${data.advice.replace(/\n/g, '<br>')}</p>
            
            <div class="grid grid-cols-3 gap-2 text-sm mt-4 font-semibold text-gray-700">
                <div class="text-left">🎨 <span class="font-bold text-red-500">행운의 색깔:</span> ${data.luckyColor}</div>
                <div class="text-center">🔢 <span class="font-bold text-blue-500">행운의 숫자:</span> ${data.luckyNumber}</div>
                <div class="text-right">🍀 <span class="font-bold text-green-600">행운의 물건:</span> ${data.luckyItem}</div>
            </div>
        </div>
    `;
    // 메인 운세 데이터 전체를 저장 (상세 분석 시 재사용)
    targetDiv.setAttribute('data-fortune-data', JSON.stringify(data));
}


// ------------------------------------
// 5. 탭 로직 (두 번째 API 호출 포함)
// ------------------------------------

function createInterestTabs(data) {
    const tabsContainer = document.getElementById('tabsContainer');
    tabsContainer.innerHTML = '';
    
    const userData = loadUserData();
    if (!userData || !userData.monthlyGoals) return;

    // 상세 분석 결과를 캐싱할 객체
    window.detailedAnalysisCache = {}; 
    window.mainFortuneData = data; 

    userData.monthlyGoals.forEach((goal, index) => {
        const button = document.createElement('button');
        button.textContent = goal;
        // 첫 번째 탭만 기본 활성화 상태로 만듭니다.
        button.className = index === 0 ? 
            'py-2 px-4 rounded-full bg-purple-800 text-white font-bold transition text-sm' : 
            'py-2 px-4 rounded-full bg-purple-200 text-purple-800 font-bold hover:bg-purple-300 transition text-sm';
        button.onclick = () => showTabContent(goal, tabsContainer);
        tabsContainer.appendChild(button);
    });
    
    // 기본 상세 설명 표시 (첫 번째 탭 자동 클릭/표시)
    if (userData.monthlyGoals.length > 0) {
        // 첫 번째 탭에 대한 상세 분석을 바로 호출합니다.
        showTabContent(userData.monthlyGoals[0], tabsContainer);
    }
}

async function showTabContent(goal, tabsContainer) {
    const tabContent = document.getElementById('tabContent');
    const userData = loadUserData();

    // 탭 버튼 활성화 상태 변경
    Array.from(tabsContainer.children).forEach(btn => {
        btn.classList.remove('bg-purple-800', 'text-white');
        btn.classList.add('bg-purple-200', 'text-purple-800');
        if (btn.textContent === goal) {
            btn.classList.add('bg-purple-800', 'text-white');
            btn.classList.remove('bg-purple-200', 'text-purple-800');
        }
    });
    
    // 캐시 확인: 이미 생성된 결과가 있으면 API 호출 없이 즉시 표시
    if (window.detailedAnalysisCache[goal]) {
        tabContent.innerHTML = window.detailedAnalysisCache[goal];
        return;
    }

    // 로딩 표시
    tabContent.innerHTML = `
        <div class="text-center p-4">
            <p class="text-lg font-bold text-purple-500">
                ✨ ${goal} 목표에 맞춘 **심층 운세 분석** 중...
            </p>
        </div>
    `;

    // 🚀 2차 API 호출 시작 (상세 분석)
    try {
        const response = await fetch('/generate-detailed-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userData: userData,
                goal: goal,
                initialAdvice: window.mainFortuneData.advice // 첫 운세 조언 전달
            })
        });
        const data = await response.json();
        const analysisText = data.detailedAnalysis.replace(/\n/g, '<br>');

        const contentHTML = `
            <h3 class="text-xl font-bold mb-3 text-purple-700">🔎 ${goal} 목표 상세 액션 플랜</h3>
            <div class="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                <p class="text-gray-800">${analysisText}</p>
            </div>
            <p class="mt-4 text-sm text-gray-500">※ 이 분석은 오늘의 사주 기운과 당신의 목표를 연결한 Gemini AI의 심층 조언입니다.</p>
        `;
        
        // 캐시에 저장 및 화면 표시
        window.detailedAnalysisCache[goal] = contentHTML;
        tabContent.innerHTML = contentHTML;

    } catch (error) {
        console.error('2차 API 호출 오류:', error);
        tabContent.innerHTML = `
            <h3 class="text-xl font-bold mb-3 text-red-600">⚠️ 분석 실패</h3>
            <p class="text-gray-600">네트워크 문제로 ${goal}에 대한 심층 분석을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        `;
    }
}


// Google Calendar 연동 관련 함수들
function checkCalendarConnection() {
    const connectBtn = document.getElementById('connectCalendarBtn');
    const statusText = document.getElementById('calendarStatus');
    const connectedStatus = document.getElementById('calendarConnectedStatus');

    // httpOnly 쿠키는 document.cookie에서 읽을 수 없으므로 서버에 상태를 물어봅니다.
    fetch('/api/calendar/status')
        .then(r => r.json())
        .then(data => {
            if (data && data.connected) {
                statusText.classList.add('hidden');
                connectBtn.classList.add('hidden');
                connectedStatus.classList.remove('hidden');
            } else {
                statusText.classList.remove('hidden');
                connectBtn.classList.remove('hidden');
                connectedStatus.classList.add('hidden');
            }
        })
        .catch(err => {
            // 네트워크 오류 시 기본 비연결 상태로 처리
            statusText.classList.remove('hidden');
            connectBtn.classList.remove('hidden');
            connectedStatus.classList.add('hidden');
            console.error('Failed to check calendar status:', err);
        });
}

// Google Calendar 연동 함수
function connectGoogleCalendar() {
    // 구글 인증 페이지로 리다이렉트
    window.location.href = '/auth/google';
}

// Google Calendar 연동 해제 함수
function disconnectGoogleCalendar() {
    document.cookie = 'google_calendar_tokens=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    checkCalendarConnection();
}

// 캘린더에 이벤트 추가 함수
async function addEventToCalendar(summary, description, date) {
    try {
        const response = await fetch('/api/calendar/event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                summary,
                description,
                date,
            }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                // 인증 토큰이 만료된 경우
                alert('캘린더 연동이 해제되었습니다. 다시 연동해주세요.');
                checkCalendarConnection();
                return null;
            }
            throw new Error('Failed to create calendar event');
        }

        const result = await response.json();
        alert('캘린더에 이벤트가 추가되었습니다!');
        return result;
    } catch (error) {
        console.error('Error adding event to calendar:', error);
        alert('캘린더 이벤트 생성에 실패했습니다. 다시 시도해주세요.');
        return null;
    }
}

// DOMContentLoaded 이벤트에 캘린더 연동 상태 체크 추가
document.addEventListener('DOMContentLoaded', () => {
    const savedData = loadUserData();
    if (savedData) {
        showHome(savedData);
        fillInputForm(savedData);
    } else {
        showOnboarding();
    }
    
    // 관심사 핸들러 연결
    const optionsContainer = document.getElementById('interestOptions');
    optionsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('interest-btn')) {
            toggleInterestSelection(e.target);
        }
    });

    // 캘린더 연동 상태 체크
    checkCalendarConnection();
});