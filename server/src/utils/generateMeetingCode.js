const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const generateMeetingCode = () => {
  let code = '';

  for (let index = 0; index < 8; index += 1) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length);
    code += CHARSET[randomIndex];
  }

  return code;
};

export default generateMeetingCode;