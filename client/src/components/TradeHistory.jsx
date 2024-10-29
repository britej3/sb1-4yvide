import React from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Flex,
  Tooltip,
  Icon
} from '@chakra-ui/react';
import { useQuery } from 'react-query';
import { FiTrendingUp, FiTrendingDown, FiClock } from 'react-icons/fi';

function TradeHistory() {
  const { data: tradeData } = useQuery(
    'tradeHistory',
    () => fetch('http://localhost:5000/api/trade-history').then(res => res.json()),
    { refetchInterval: 5000 }
  );

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" w="100%">
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">Trade History</Heading>
        {tradeData?.summary && (
          <Flex gap={4}>
            <Tooltip label="Success Rate">
              <Badge colorScheme="green">
                {tradeData.summary.successRate.toFixed(1)}% Success
              </Badge>
            </Tooltip>
            <Tooltip label="Average Execution Time">
              <Badge colorScheme="blue">
                <Icon as={FiClock} mr={1} />
                {formatDuration(tradeData.summary.avgExecutionTime)}
              </Badge>
            </Tooltip>
          </Flex>
        )}
      </Flex>

      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Time</Th>
              <Th>Pair</Th>
              <Th>Type</Th>
              <Th isNumeric>Price</Th>
              <Th isNumeric>Amount</Th>
              <Th isNumeric>Profit</Th>
              <Th>Execution</Th>
            </Tr>
          </Thead>
          <Tbody>
            {tradeData?.trades?.map((trade) => (
              <Tr key={trade.id}>
                <Td>{formatTime(trade.timestamp)}</Td>
                <Td>{trade.token}</Td>
                <Td>
                  <Badge
                    colorScheme={trade.type === 'BUY' ? 'green' : 'red'}
                    display="flex"
                    alignItems="center"
                    width="fit-content"
                  >
                    <Icon 
                      as={trade.type === 'BUY' ? FiTrendingUp : FiTrendingDown} 
                      mr={1}
                    />
                    {trade.type}
                  </Badge>
                </Td>
                <Td isNumeric>${trade.price.toFixed(2)}</Td>
                <Td isNumeric>${trade.amount.toFixed(2)}</Td>
                <Td isNumeric>
                  <Text color={trade.profit >= 0 ? 'green.500' : 'red.500'}>
                    ${trade.profit?.toFixed(2) || '0.00'}
                  </Text>
                </Td>
                <Td>
                  <Tooltip label={`Gas: ${trade.gasUsed} gwei`}>
                    <Badge 
                      colorScheme={trade.executionTime < 3000 ? 'green' : 'yellow'}
                    >
                      {formatDuration(trade.executionTime)}
                    </Badge>
                  </Tooltip>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

export default TradeHistory;