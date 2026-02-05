export type Locale = {
  common: {
    login: string;
    logout: string;
    myPage: string;
    save: string;
    cancel: string;
    skip: string;
    back: string;
    backToHome: string;
    search: string;
    searchGames: string;
    loading: string;
    saving: string;
    saved: string;
    error: string;
    player: string;
  };
  auth: {
    playerZone: string;
    googleLogin: string;
    loginToSave: string;
    setYourInitials: string;
    initialsNotSet: string;
  };
  myPage: {
    title: string;
    profileSettings: string;
    yourInitials: string;
    initialsDescription: string;
    initialsRequired: string;
    initialsTooLong: string;
    initialsInvalid: string;
    initialsUpdated: string;
    initialsUpdateFailed: string;
    gameHistory: string;
    noGameRecords: string;
    playAndRecord: string;
    gamesPlayed: string;
    rank: string;
    keyboardHint: string;
    selectCharacter: string;
    characterDescription: string;
    characterMale: string;
    characterFemale: string;
    characterUpdated: string;
    characterUpdateFailed: string;
  };
  game: {
    gameOver: string;
    score: string;
    pressRToRestart: string;
    saveScore: string;
    loginRequired: string;
    setInitialsFirst: string;
    goToMyPage: string;
    saveToLeaderboard: string;
    initials: string;
  };
  alert: {
    setInitialsTitle: string;
    setInitialsDescription: string;
  };
  category: {
    all: string;
    game: string;
    goodLuck: string;
    utility: string;
  };
};

export const ko: Locale = {
  common: {
    login: '로그인',
    logout: '로그아웃',
    myPage: '마이페이지',
    save: '저장',
    cancel: '취소',
    skip: '건너뛰기',
    back: '뒤로',
    backToHome: '홈으로 돌아가기',
    search: '검색',
    searchGames: '게임 검색...',
    loading: '로딩 중...',
    saving: '저장 중...',
    saved: '저장됨!',
    error: '오류가 발생했습니다',
    player: '플레이어',
  },
  auth: {
    playerZone: '플레이어 존',
    googleLogin: 'Google 로그인',
    loginToSave: '로그인하면 점수를 리더보드에 기록할 수 있습니다!',
    setYourInitials: '이니셜을 설정하세요',
    initialsNotSet: '이니셜 미설정',
  },
  myPage: {
    title: '마이페이지',
    profileSettings: '프로필 설정',
    yourInitials: '나의 이니셜',
    initialsDescription: 'A-Z만 가능, 1-5자. 공백 허용 (시작 제외)',
    initialsRequired: '이니셜을 입력하세요',
    initialsTooLong: '이니셜은 1-5자여야 합니다',
    initialsInvalid: 'A-Z와 공백만 허용 (시작 제외)',
    initialsUpdated: '이니셜이 업데이트되었습니다!',
    initialsUpdateFailed: '이니셜 업데이트 실패',
    gameHistory: '게임 기록',
    noGameRecords: '아직 게임 기록이 없습니다',
    playAndRecord: '게임을 플레이하고 점수를 기록하세요!',
    gamesPlayed: '회 플레이',
    rank: '순위',
    keyboardHint: '방향키로 이동, Enter로 선택, 클릭으로 입력',
    selectCharacter: '캐릭터 선택',
    characterDescription: '나를 대표할 캐릭터를 선택하세요',
    characterMale: '남자',
    characterFemale: '여자',
    characterUpdated: '캐릭터가 변경되었습니다!',
    characterUpdateFailed: '캐릭터 변경 실패',
  },
  game: {
    gameOver: '게임 오버',
    score: '점수',
    pressRToRestart: 'R을 눌러 재시작',
    saveScore: '점수 저장',
    loginRequired: '점수를 저장하려면 로그인하세요',
    setInitialsFirst: '점수를 기록하려면 먼저 이니셜을 설정하세요!',
    goToMyPage: '마이페이지로 이동',
    saveToLeaderboard: '리더보드에 점수를 저장하시겠습니까?',
    initials: '이니셜',
  },
  alert: {
    setInitialsTitle: '이니셜을 설정하세요',
    setInitialsDescription: '리더보드에 점수를 저장하려면 이니셜을 설정해야 합니다!',
  },
  category: {
    all: '전체',
    game: '게임',
    goodLuck: '행운',
    utility: '유틸리티',
  },
};
