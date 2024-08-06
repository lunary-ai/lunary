import { Page, expect, test } from "@playwright/test"
require('dotenv').config();
import { config , UserInfo} from "./helpers/constants"
import { uniqueStr } from "./helpers/uniqueStr"
import lunary from "lunary"
import OpenAI from "openai"
import { monitorOpenAI } from "lunary/openai"
import { setOrgPro } from "./utils/db"
import { LoginPage } from "./page/login.po"
import { CommAction } from "./page/common.po"
import { HomePage } from "./page/home.po"
import { SignUpPage } from "./page/signUp.po"
import { AnalyticsPage } from "./page/analytics.po"
import { LogsPage } from "./page/logs.po"
import { ThreatsPage } from "./page/threats.po";
import { TracesPage } from "./page/traces.po";

let page: Page;
let context: any;
let userName:string; 
let email :string;
let email1 :string;
let email2 :string;
let userName1 :string;
let userName2 :string;

let contentSystem1 :string;
let contentSystem2 :string;
let contentUser1 :string;
let contentUser2 :string;

test.describe('Feedback', () => {
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const login = new LoginPage(page);
    
    const homePage = new HomePage(page);
    const signUpPage = new SignUpPage(page);
    const commonPage = new CommAction(page);
    const analyticsPage = new AnalyticsPage(page);

    userName =uniqueStr('user');
    email = uniqueStr('test') + '@example.com';

    email1 = uniqueStr('test1') + '@example.com';
    userName1 =uniqueStr('user1');

    email2 = uniqueStr('test2') + '@example.com';
    userName2 =uniqueStr('user2');

    contentSystem1 = "Hi friend message 1";
    contentSystem2 = "Hi friend message 2";
    contentUser1 = "Can you help me on message 1";
    contentUser2 = "Can you help me on message 2";
    await login.openUrl(config.BASE_URL);
    await homePage.clickSignUpBtn();
    await signUpPage.signUpAccountStep1(email, UserInfo.password, userName);
    await signUpPage.signUpAccountStep2("TESTPROJECT","TESTORG", UserInfo.companySize, UserInfo.option);
    await signUpPage.clickSkipDashboard();
    await commonPage.clickMenu('Analytics');
    const projectId =  await analyticsPage.getProjectId();
    await commonPage.initLunaryOpenAI(projectId);
    await setOrgPro()
    const openai = monitorOpenAI(new OpenAI({ apiKey: config.OPENAI_API_KEY}))
  const thread = lunary.openThread({
    userId: "tristina Test",
    userProps: { name: "tristina Testing" },
    tags: ['testing thread']
  })
  const msgId = thread.trackMessage({
    role: 'assistant',
    content: 'testing'
  })
  const result = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.9,
    tags: ["chat", "support"],  // Optional: tags
    user: email1,  // Optional: user ID
    userProps: { name: userName1 },  // Optional: user properties
    messages: [
      { role: "system", content: contentSystem1 },
      { role: "user", content: contentUser1 },
    ],
    
  }).setParent(msgId)
 
    
  const msgId2 = thread.trackMessage({
    role: 'user',
    content: result.choices[0].message.content
  })

  const result2 = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.9,
    tags: ["chat", "support"],  // Optional: tags
    user: email2,  // Optional: user ID
    userProps: { name: userName2 },  // Optional: user properties
    messages: [
      { role: "system", content: contentSystem2},
      { role: "user", content: contentUser2},
    ],
    
  }).setParent(msgId2)
  
  const agent = lunary.wrapAgent(function ChatbotAgent(query) {
    console.log('test agent');
  })
  
  await agent("Hello!").setParent(msgId)
  const calculator = lunary.wrapTool(async function Calculator(input) {
    // Your custom logic
    // ...
  })
  
  await calculator('1 + 2')
  });

  

  test("Adding a thumb up/down to a from a llm call to verify feedback", async ({page}) => {
    const commonPage = new CommAction(page);
    const logsPage = new LogsPage(page);
    const loginPage = new LoginPage(page);

    await loginPage.openUrl(config.BASE_URL);
    await loginPage.login(email, UserInfo.password);

    await commonPage.clickMenu('Logs');
  
    await logsPage.clickMessage(contentUser2);
    await logsPage.verifyThumbUpDownIsDisplayedOnBanner();
    await logsPage.clickThumbUpIcon();
    await logsPage.verifyThumbUpIconTurnGreen();
    await logsPage.closeModal();
    await logsPage.verifyThumbUpIconIsDisplayed(contentUser2);

    await logsPage.clickMessage(contentUser2);
    await logsPage.clickThumbDownIcon();
    await logsPage.verifyThumbDownIconTurnRed();
    await logsPage.closeModal();
    await logsPage.verifyThumbDownIconIsDisplayed(contentUser2);  
    
  })

  test("Adding a comment and verify it", async ({page}) => {
    const commonPage = new CommAction(page);
    const logsPage = new LogsPage(page);
    const loginPage = new LoginPage(page);

    await loginPage.openUrl(config.BASE_URL);
    await loginPage.login(email, UserInfo.password);

    await commonPage.clickMenu('Logs');
    
    await logsPage.clickMessage(contentUser2);
    await logsPage.clickMessageIcon();
    const comment =uniqueStr('user');
    await logsPage.sendComment(comment);
    await logsPage.closeModal();
    await logsPage.hoverCommentIcon(contentUser2);
    await logsPage.verifyCommentIsDisplayed(contentUser2, comment);
  })

  test("Adding a thumb up/down from a trace to verify feedback", async ({page}) => {
    const commonPage = new CommAction(page);
    const logsPage = new LogsPage(page);
    const threatsPage = new ThreatsPage(page);
    const tracesPage = new TracesPage(page);
    const loginPage = new LoginPage(page);

    await loginPage.openUrl(config.BASE_URL);
    await loginPage.login(email, UserInfo.password);

    await commonPage.clickMenu('Logs');
    await commonPage.clickTab('Threads');
    await threatsPage.clickTagName('testing thread');
    await threatsPage.clickViewTraceButton();
    await tracesPage.clickTagName('gpt-4o');
    await tracesPage.verifyThumbUpDownIsDisplayedOnBanner();
    await tracesPage.clickThumbUpIcon();
    
    await tracesPage.verifyThumbUpIconTurnGreen();
    
    await commonPage.clickMenu('Logs');
    await logsPage.verifyThumbUpIconIsDisplayed(contentUser1);

    await commonPage.clickTab('Threads');
    await threatsPage.clickTagName('testing thread');
    await threatsPage.clickViewTraceButton();
    await tracesPage.clickTagName('gpt-4o');
    await tracesPage.clickThumbDownIcon();
    await tracesPage.verifyThumbDownIconTurnRed();
    
    await commonPage.clickMenu('Logs');
    await logsPage.verifyThumbDownIconIsDisplayed(contentUser1);

    
  })

  test("Adding a comment from a trace to verify feedback", async ({page}) => {
    const commonPage = new CommAction(page);
    const logsPage = new LogsPage(page);
    const loginPage = new LoginPage(page);
    const threatsPage = new ThreatsPage(page);
    const tracesPage = new TracesPage(page);
    const comment =uniqueStr('comment from trace');
    await loginPage.openUrl(config.BASE_URL+'');
    await loginPage.login(email, UserInfo.password);

    await commonPage.clickMenu('Logs');

    await commonPage.clickTab('Threads');
    await threatsPage.clickTagName('testing thread');
    await threatsPage.clickViewTraceButton();
    await tracesPage.clickTagName('gpt-4o');
    await tracesPage.clickMessageIcon();
    await tracesPage.sendComment(comment);
    
    await commonPage.clickMenu('Logs');
    await logsPage.hoverCommentIcon(contentUser1);
    await logsPage.verifyCommentIsDisplayed(contentUser1, comment);

    
  })
});