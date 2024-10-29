import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  HStack,
  Text,
  Badge,
  NumberInput,
  NumberInputField,
  FormControl,
  FormLabel,
  VStack,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress
} from '@chakra-ui/react';
import { useQuery } from 'react-query';

function BotControls() {
  const [isRunning, setIsRunning] = useState(false);
  const [capital, setCapital] = useState(100);
  const toast = useToast();

  const { data: botStats, refetch } = useQuery(
    'botStats',
    () => fetch('http://localhost:5000/api/bot/stats').then(res => res.json()),
    { refetchInterval: 3000 }
  );

  const handleToggleBot = async () => {
    try {
      if (capital < 100) {
        throw new Error('Minimum capital requirement is 100 USDT');
      }

      const response = await fetch('http://localhost:5000/api/bot/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: isRunning ? 'stop' : 'start',
          capital 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle bot');
      }

      setIsRunning(!isRunning);
      refetch();

      toast({
        title: isRunning ? 'Bot Stopped' : 'Bot Started',
        description: isRunning ? 
          'Trading operations halted' : 
          `Trading started with ${capital} USDT`,
        status: isRunning ? 'info' : 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const getHealthColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" w="100%">
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="lg" fontWeight="bold">Bot Status: 
            <Badge ml={2} colorScheme={isRunning ? 'green' : 'red'}>
              {isRunning ? 'Running' : 'Stopped'}
            </Badge>
          </Text>
          {botStats?.monitoring?.healthStatus && (
            <Badge colorScheme={getHealthColor(botStats.monitoring.healthStatus)}>
              {botStats.monitoring.healthStatus}
            </Badge>
          )}
        </HStack>

        <SimpleGrid columns={2} spacing={4}>
          <Stat>
            <StatLabel>Active Positions</StatLabel>
            <StatNumber>{botStats?.positions?.length || 0}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Win Rate</StatLabel>
            <StatNumber>
              {botStats?.monitoring?.winRate?.toFixed(1)}%
            </StatNumber>
          </Stat>
        </SimpleGrid>

        {botStats?.monitoring?.executionStats && (
          <Box>
            <Text fontSize="sm" mb={1}>Queue Status</Text>
            <Progress 
              value={botStats.monitoring.executionStats.queueLength} 
              max={10}
              colorScheme={botStats.monitoring.executionStats.queueLength > 5 ? 'orange' : 'green'}
            />
            <Text fontSize="xs" mt={1}>
              {botStats.monitoring.executionStats.queueLength} pending trades
            </Text>
          </Box>
        )}

        <FormControl>
          <FormLabel>Trading Capital (USDT)</FormLabel>
          <NumberInput
            min={100}
            value={capital}
            onChange={(value) => setCapital(parseFloat(value))}
            isDisabled={isRunning}
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>

        <Button
          colorScheme={isRunning ? 'red' : 'green'}
          onClick={handleToggleBot}
          size="lg"
          isDisabled={botStats?.monitoring?.healthStatus === 'CRITICAL'}
        >
          {isRunning ? 'Stop Trading' : 'Start Trading'}
        </Button>
      </VStack>
    </Box>
  );
}

export default BotControls;