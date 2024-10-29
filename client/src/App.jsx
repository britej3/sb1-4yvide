import React from 'react';
import { ChakraProvider, Box, Grid, VStack, Container } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import BotControls from './components/BotControls';
import PriceChart from './components/PriceChart';
import TradeHistory from './components/TradeHistory';
import ProfitTracker from './components/ProfitTracker';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 3000,
      staleTime: 2000,
      retry: 1
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <Container maxW="container.xl" py={5}>
          <Grid
            templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }}
            gap={6}
          >
            <VStack spacing={6}>
              <BotControls />
              <PriceChart />
            </VStack>
            <VStack spacing={6}>
              <ProfitTracker />
              <TradeHistory />
            </VStack>
          </Grid>
        </Container>
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default App;