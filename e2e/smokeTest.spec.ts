import { Page, expect, test } from "@playwright/test"
import { UserInfo, config } from "./helpers/constants"
require('dotenv').config();
import { generateUserName, uniqueStr } from "./helpers/uniqueStr"
import  {SignUpPage} from "../e2e/page/signUp.po";
import { CommAction } from "./page/common.po";
import { DatasetPage } from "./page/dataset.po";
import {LoginPage} from "./page/login.po";
import { UserPage } from "./page/users.po";
import { UserDetailPage } from "./page/usersDetail.po";
import { HomePage } from "./page/home.po";
import { AnalyticsPage } from "./page/analytics.po";

let page: Page;
let context: any;
let userName:string; 
let email :string;

test.describe('Smoke test', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const login = new LoginPage(page);
    userName =uniqueStr('test');
    email = uniqueStr('test') + '@example.com';
    await login.openUrl(config.BASE_URL);
  });

  test("Verify search user", async () => {
    const homePage = new HomePage(page);
    const signUpPage = new SignUpPage(page);
    const commonPage = new CommAction(page);
    const analyticsPage = new AnalyticsPage(page);
    const userPage = new UserPage(page);
    const userDetailPage = new UserDetailPage(page);

    await homePage.clickSignUpBtn();
    await signUpPage.signUpAccountStep1(email, UserInfo.password, userName);
    await signUpPage.signUpAccountStep2("TESTPROJECT","TESTORG", UserInfo.companySize, UserInfo.option);
    await signUpPage.clickSkipDashboard();
    await commonPage.clickMenu('Analytics');
    const projectId =  await analyticsPage.getProjectId();
    await commonPage.initLunaryOpenAI(projectId);
    await commonPage.openAI(email, userName);

    await commonPage.clickMenu('Users');
    await userPage.searchUser(userName);
    await userPage.clickUserName(userName);
    await userDetailPage.verifyUserInfo(userName, email);
  })

  test("Verify dataset", async () => {
    const commonPage = new CommAction(page);
    const datasetPage = new DatasetPage(page);
    const loginPage = new LoginPage(page);

    await commonPage.clickMenu('Evaluations');
    await commonPage.clickMenu('Datasets');
    await datasetPage.clickNewChatDatasetBtn();
    const dataset1 = generateUserName(10);
    await datasetPage.renameDataset(dataset1);
    await datasetPage.clickBackBtn();
    await datasetPage.verifyDatasetNameIsDisplayed(dataset1);

    await datasetPage.clickNewDatasetBtn();
    const dataset2 = generateUserName(10);
    await datasetPage.renameDataset(dataset2);
    await datasetPage.clickBackBtn();
    await datasetPage.verifyDatasetNameIsDisplayed(dataset2);
    await datasetPage.deleteDatasetIcon(dataset2);
    await datasetPage.verifyDatasetNameIsNotDisplayed(dataset2);
  })
});


