import {
  ChakraProvider,
  Container,
  Heading,
  HStack,
  VStack,
} from '@chakra-ui/react';
import { FirebaseOptions } from 'firebase/app';
import React from 'react';
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
  return (
    <HStack
      as="nav"
      spacing={4}
      alignItems="center"
      display={{ base: 'none', md: 'flex' }}
    >
      <Heading as="h1">Soliluna</Heading>
      {pages.map((x) => (
        <Link key={x.path} to={x.path}>
          {x.title}
        </Link>
      ))}
    </HStack>
  );
}

export function App() {
  return (
    <Firebase config={firebaseConfig}>
      <ChakraProvider>
        <Header />
        <Container>
          <VStack gap={3} align="stretch">
            <Outlet />
          </VStack>
        </Container>
      </ChakraProvider>
    </Firebase>
  );
}
