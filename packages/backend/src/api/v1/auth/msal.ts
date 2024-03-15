import msal from "@azure/msal-node"

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID!, // 'Application (client) ID' of app registration in Azure portal - this value is a GUID
    authority:
      (process.env.AZURE_AD_CLOUD_INSTANCE ||
        "https://login.microsoftonline.com/") + process.env.AZURE_AD_TENANT_ID, // Full directory URL, in the form of https://login.microsoftonline.com/<tenant>
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET, // Client secret generated from the app registration in Azure portal
  },
}

const msalClient = new msal.ConfidentialClientApplication(msalConfig)
const cryptoProvider = new msal.CryptoProvider()

function loginGetConsent(options = {}) {
  /**
   * MSAL Node library allows you to pass your custom state as state parameter in the Request object.
   * The state parameter can also be used to encode information of the app's state before redirect.
   * You can pass the user's state in the app, such as the page or view they were on, as input to this parameter.
   */
  const state = cryptoProvider.base64Encode(
    JSON.stringify({
      successRedirect: "/",
    }),
  )

  const authCodeUrlRequestParams = {
    state: state,

    /**
     * By default, MSAL Node will add OIDC scopes to the auth code url request. For more information, visit:
     * https://docs.microsoft.com/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
     */
    scopes: ["openid", "profile", "email"],
    redirectUri: process.env.NEXT_PUBLIC_API_URL + "/auth/callbacks/msal",
  }

  const authCodeRequestParams = authCodeUrlRequestParams

  /**
   * If the current msal configuration does not have cloudDiscoveryMetadata or authorityMetadata, we will
   * make a request to the relevant endpoints to retrieve the metadata. This allows MSAL to avoid making
   * metadata discovery calls, thereby improving performance of token acquisition process. For more, see:
   * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/performance.md
   */
  // if (
  //   !this.msalConfig.auth.cloudDiscoveryMetadata ||
  //   !this.msalConfig.auth.authorityMetadata
  // ) {
  //   const [cloudDiscoveryMetadata, authorityMetadata] = await Promise.all([
  //     this.getCloudDiscoveryMetadata(this.msalConfig.auth.authority),
  //     this.getAuthorityMetadata(this.msalConfig.auth.authority),
  //   ])

  //   this.msalConfig.auth.cloudDiscoveryMetadata = JSON.stringify(
  //     cloudDiscoveryMetadata,
  //   )
  //   this.msalConfig.auth.authorityMetadata = JSON.stringify(authorityMetadata)
  // }

  // trigger the first leg of auth code flow
  // return redirectToAuthCodeUrl(
  //   authCodeUrlRequestParams,
  //   authCodeRequestParams,
  //   msalClient,
  // )(req, res, next)
}
