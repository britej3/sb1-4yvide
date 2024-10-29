import React from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Text,
  VStack,
  HStack,
  Tooltip,
  Icon
} from '@chakra-ui/react';
import { useQuery } from 'react-query';
import { FiTrendingUp, FiTrendingDown, FiAlertTriangle } from 'react-icons/fi';

function ProfitTracker() {
  const { data: profitData } = useQuery(
    'profitData',
    () => fetch('http://localhost:5000/api/profit-data').then(res => res.json()),
    { refetchInterval: 3000 }
  );

  if (!profitData) return null;

  const {
    totalProfit,
    dailyProfit,
    weeklyProfit,
    roi,
    drawdown,
    riskMetrics
  } = profitData;

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" w="100%">
      <VStack spacing={4} align="stretch">
        <Heading size="md">Profit Analytics</Heading>

        <SimpleGrid columns={2} spacing={4}>
          <Stat>
            <StatLabel>Total Profit</StatLabel>
            <StatNumber color={totalProfit >= 0 ? 'green.500' : 'red.500'}>
              ${totalProfit.toFixed(2)}
            </StatNumber>
            <StatHelpText>
              <StatArrow type={dailyProfit >= 0 ? 'increase' : 'decrease'} />
              ${Math.abs(dailyProfit).toFixed(2)} today
            </StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>ROI</StatLabel>
            <StatNumber color={roi >= 0 ? 'green.500' : 'red.500'}>
              {roi.toFixed(2)}%
            </StatNumber>
            <StatHelpText>
              <StatArrow type={weeklyProfit >= 0 ? 'increase' : 'decrease'} />
              {weeklyProfit.toFixed(2)}% this week
            </StatHelpText>
          </Stat>
        </SimpleGrid>

        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="sm">Drawdown</Text>
            <Tooltip label="Maximum drawdown from peak">
              <Text fontSize="sm" color={drawdown > 5 ? 'orange.500' : 'gray.600'}>
                {drawdown.toFixed(2)}%
              </Text>
            </Tooltip>
          </HStack>
          <Progress
            value={drawdown}
            max={10}
            colorScheme={drawdown > 5 ? 'orange' : 'green'}
            borderRadius="md"
          />
        </Box>

        {riskMetrics && (
          <SimpleGrid columns={2} spacing={4}>
            <Box>
              <HStack mb={1}>
                <Text fontSize="sm">Win Rate</Text>
                <Icon 
                  as={riskMetrics.winRate >= 50 ? FiTrendingUp : FiTrendingDown}
                  color={riskMetrics.winRate >= 50 ? 'green.500' : 'red.500'}
                />
              </HStack>
              <Progress
                value={riskMetrics.winRate}
                max={100}
                colorScheme={riskMetrics.winRate >= 50 ? 'green' : 'orange'}
                borderRadius="md"
              />
              <Text fontSize="xs" textAlign="right" mt={1}>
                {riskMetrics.winRate.toFixed(1)}%
              </Text>
            </Box>

            <Box>
              <HStack mb={1}>
                <Text fontSize="sm">Profit Factor</Text>
                {riskMetrics.profitFactor < 1.2 && (
                  <Tooltip label="Low profit factor">
                    <Icon as={FiAlertTriangle} color="orange.500" />
                  </Tooltip>
                )}
              </HStack>
              <Progress
                value={Math.min(riskMetrics.profitFactor * 50, 100)}
                max={100}
                colorScheme={riskMetrics.profitFactor >= 1.2 ? 'green' : 'orange'}
                borderRadius="md"
              />
              <Text fontSize="xs" textAlign="right" mt={1}>
                {riskMetrics.profitFactor.toFixed(2)}
              </Text>
            </Box>
          </SimpleGrid>
        )}
      </VStack>
    </Box>
  );
}

export default ProfitTracker;