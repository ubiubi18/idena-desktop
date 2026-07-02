import React from 'react'
import {useTranslation} from 'react-i18next'
import {Box, Flex, Heading, Stack} from '@chakra-ui/react'
import {FillCenter} from '../screens/oracles/components'
import Layout from '../shared/components/layout'
import {PrimaryButton} from '../shared/components/button'
import {Page} from '../shared/components/components'

global.logger = global.logger || {
  error() {},
}

// eslint-disable-next-line react/prop-types
function MyError({statusCode}) {
  const {t} = useTranslation()

  return (
    <Layout>
      <Page p={0}>
        <Flex
          bg="graphite.500"
          color="white"
          direction="column"
          flex={1}
          w="full"
        >
          <Box bg="red.500" p={3} textAlign="center">
            {t('Something went wrong')}
          </Box>
          <FillCenter>
            <Stack align="center">
              <Heading fontSize="lg" fontWeight={500}>
                {statusCode
                  ? `An error ${statusCode} occurred on server`
                  : t('An error occurred on client')}
              </Heading>
              <Box>
                <PrimaryButton
                  onClick={() => global.ipcRenderer.send('reload')}
                >
                  {t('Go to My Idena')}
                </PrimaryButton>
              </Box>
            </Stack>
          </FillCenter>
        </Flex>
      </Page>
    </Layout>
  )
}

export default MyError
