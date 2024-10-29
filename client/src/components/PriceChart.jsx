import React, { useEffect, useState } from 'react';
import { Box, Heading } from '@chakra-ui/react';
import { Line } from 'react-chartjs-2';
import { useQuery } from 'react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const chartOptions = {
  responsive: true,
  animation: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  scales: {
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      grid: {
        drawOnChartArea: false,
      },
    },
  },
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: false,
    },
  },
};

function PriceChart() {
  const { data: priceData } = useQuery(
    'priceData',
    () => fetch('http://localhost:5000/api/price-data').then(res => res.json()),
    { refetchInterval: 3000 }
  );

  const chartData = {
    labels: priceData?.timestamps || [],
    datasets: [
      {
        label: 'WETH/USDC',
        data: priceData?.prices?.WETH || [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'WMATIC/USDC',
        data: priceData?.prices?.WMATIC || [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y',
      },
    ],
  };

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" w="100%" bg="white">
      <Heading size="md" mb={4}>Price Chart</Heading>
      <Box h="300px">
        <Line options={chartOptions} data={chartData} />
      </Box>
    </Box>
  );
}

export default PriceChart;