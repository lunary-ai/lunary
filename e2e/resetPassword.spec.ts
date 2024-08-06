import test, { Page,expect } from "@playwright/test"
import { RequestResetPasswordPage } from "./page/requestResetPassword.po"
import { getRecoveryToken } from "./utils/db";
import { config,UserInfo } from "./helpers/constants";
import { CommAction } from "./page/common.po";
import { ResetPasswordPage } from "./page/resetPassword.po";
import {LoginPage} from "./page/login.po";
import { uniqueStr } from "./helpers/uniqueStr"
import { SignUpPage } from "./page/signUp.po"
import { HomePage } from "./page/home.po"

let page: Page;
let context: any;
let userName:string; 
let email :string;
test.describe('Feedback', () => {
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const login = new LoginPage(page);
    
    const homePage = new HomePage(page);
    const signUpPage = new SignUpPage(page);
    const commonPage = new CommAction(page);

    userName =uniqueStr('user');
    email = uniqueStr('test') + '@example.com';

    await login.openUrl(config.BASE_URL);
    await homePage.clickSignUpBtn();
    await signUpPage.signUpAccountStep1(email, UserInfo.password, userName);
    await signUpPage.signUpAccountStep2("TESTPROJECT","TESTORG", UserInfo.companySize, UserInfo.option);
    await signUpPage.clickSkipDashboard();
    
  });

test("Reset password", async ({  }) => {
const requestResetPass = new RequestResetPasswordPage(page);
  const commonPage = new CommAction(page);
  const resetPasswordPage = new ResetPasswordPage(page);
  const loginPage = new LoginPage(page);
  await commonPage.logOut();
  await requestResetPass.openUrl(config.BASE_URL + '/request-password-reset')
  await requestResetPass.inputEmail(email);
  const token = await getRecoveryToken(email);
  await requestResetPass.openUrl(config.BASE_URL + `/reset-password?token=${token}`);
  await resetPasswordPage.inputNewPassword('Abcd1234!');
  await commonPage.logOut();
  await loginPage.login(email,'Abcd1234!');
  await commonPage.verifyCurrentUrl(config.BASE_URL+'/analytics');
})
});