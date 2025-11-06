// Google OAuth 설정을 환경변수에서 불러옵니다.
// .env에 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET가 설정되어 있어야 합니다.
module.exports = {
	google: {
		client_id: process.env.GOOGLE_CLIENT_ID,
		client_secret: process.env.GOOGLE_CLIENT_SECRET,
		// 개발용 기본값(환경변수로 덮어쓸 수 있음)
		redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
		scopes: [
			'https://www.googleapis.com/auth/calendar.readonly',
			'https://www.googleapis.com/auth/calendar.events'
		]
	}
};

