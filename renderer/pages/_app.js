/* eslint-disable react/prop-types */
import React from 'react'
import Head from 'next/head'
import {ChakraProvider, extendTheme} from '@chakra-ui/react'
import '../i18n'
import {QueryClientProvider} from 'react-query'
import {theme} from '../shared/theme'
import {NodeProvider} from '../shared/providers/node-context'
import {SettingsProvider} from '../shared/providers/settings-context'
import {AutoUpdateProvider} from '../shared/providers/update-context'
import {ChainProvider} from '../shared/providers/chain-context'
import {TimingProvider} from '../shared/providers/timing-context'
import {EpochProvider} from '../shared/providers/epoch-context'
import {IdentityProvider} from '../shared/providers/identity-context'
import {VotingNotificationProvider} from '../shared/providers/voting-notification-context'
import {OnboardingProvider} from '../shared/providers/onboarding-context'
import {queryClient} from '../shared/utils/utils'

export default function App({Component, ...pageProps}) {
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link href="/static/scrollbars.css" rel="stylesheet" />
      </Head>

      <ChakraProvider theme={extendTheme(theme)}>
        <AppProviders>
          <Component {...pageProps} />
        </AppProviders>
      </ChakraProvider>
    </>
  )
}

function AppProviders(props) {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AutoUpdateProvider>
          <NodeProvider>
            <ChainProvider>
              <TimingProvider>
                <EpochProvider>
                  <IdentityProvider>
                    <OnboardingProvider>
                      <VotingNotificationProvider {...props} />
                    </OnboardingProvider>
                  </IdentityProvider>
                </EpochProvider>
              </TimingProvider>
            </ChainProvider>
          </NodeProvider>
        </AutoUpdateProvider>
      </SettingsProvider>
    </QueryClientProvider>
  )
}
