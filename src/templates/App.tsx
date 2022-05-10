import {
  ChakraProvider,
  Container,
  Grid,
  Heading,
  Text,
  useColorMode,
  VStack,
} from '@chakra-ui/react';
import { FirebaseOptions } from 'firebase/app';
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Firebase } from '../components/Firebase';
import { Link } from '../components/Link';
import { pages } from '../router';

const stringConfig = process.env.FIREBASE_CONFIGURATION;

if (!stringConfig) {
  throw new Error(`Environment variable FIREBASE_CONFIGURATION is required!`);
}

const firebaseConfig = JSON.parse(stringConfig) as FirebaseOptions;

function Header() {
  const { colorMode, toggleColorMode } = useColorMode();

  useEffect(() => {
    if (colorMode !== 'dark') {
      toggleColorMode();
    }
  }, [colorMode]);

  return (
    <Grid templateColumns="auto 1fr" alignItems="baseline" marginBottom={8}>
      <Heading as="h1">Soliluna</Heading>
      <Grid
        as="nav"
        justifyContent="center"
        templateColumns="repeat(3, auto)"
        gap={['var(--chakra-space-2)', 'var(--chakra-space-8)']}
      >
        {pages.map((x) => (
          <Link key={x.path} to={x.path}>
            <Text textAlign="center">{x.title}</Text>
          </Link>
        ))}
      </Grid>
    </Grid>
  );
}

export function App() {
  return (
    <Firebase config={firebaseConfig}>
      <ChakraProvider resetCSS>
        <Header />
        <Container paddingBottom="var(--chakra-space-16)" maxW="45rem">
          <VStack gap="var(--chakra-space-2)" align="stretch">
            <Outlet />
          </VStack>
        </Container>
      </ChakraProvider>
    </Firebase>
  );
}
