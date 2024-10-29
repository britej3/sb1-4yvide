import React from 'react';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react';
import { useQuery } from 'react-query';

function TradingPairs() {
  const { data: tradingData } = useQuery('tradingData', () =>
    fetch('http://localhost:3000/api/trading-data').then(res => res.json())
  );

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" w="100%">
      <Heading size="md" mb={4}>Trading Pairs</Heading>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Pair</Th>
            <Th isNumeric>Price</Th>
            <Th>Last Update</Th>
          </Tr>
        </Thead>
        <Tbody>
          {tradingData?.prices && Object.entries(tradingData.prices).map(([pair, data]) => (
            <Tr key={pair}>
              <Td>{pair}</Td>
              <Td isNumeric>${data.price.toFixed(2)}</Td>
              <Td>{new Date(data.timestamp).toLocaleTimeString()}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export default TradingPairs;