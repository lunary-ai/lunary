const BASE_URL = process.env.APP_URL || 'http://localhost:8080';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_URL = process.env.LUNARY_API_URL || 'http://localhost:3333';
if (
  !OPENAI_API_KEY 
) {
  throw 'Missing environment variables';
}
export const config = {
    BASE_URL,
    OPENAI_API_KEY,
    API_URL,
  };

  export const Constants = {
    defaultPassword: 'bl@ckr0ck',
    defaultuserName: 'bl@automationTesting@gmail.com'
  };

  export const UserInfo = {
    userName: 'Tristina',
    email: 'test@example.com',
    password: '12345678',
    companySize: '6-49',
    option: 'Other',
  };
