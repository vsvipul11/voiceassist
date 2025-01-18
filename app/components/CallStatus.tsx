import React, { ReactNode } from 'react';

interface CallStatusProps {
  status: string;
  children?: ReactNode;
}

const CallStatus: React.FC<CallStatusProps> = ({ status, children }) => {
  // Function to determine status color
  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'off':
        return 'text-gray-500';
      case 'error':
      case 'failed':
        return 'text-red-500';
      case 'listening':
        return 'text-blue-500';
      case 'thinking':
        return 'text-yellow-500';
      case 'speaking':
        return 'text-green-500';
      case 'ready':
      case 'success':
        return 'text-green-500';
      default:
        return 'text-white';
    }
  };

  // Function to determine dot color
  const getStatusDotColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'off':
        return 'bg-gray-500';
      case 'error':
      case 'failed':
        return 'bg-red-500';
      case 'listening':
        return 'bg-blue-500';
      case 'thinking':
        return 'bg-yellow-500';
      case 'speaking':
        return 'bg-green-500 animate-pulse';
      case 'ready':
      case 'success':
        return 'bg-green-500';
      default:
        return 'bg-blue-500';
    }
  };

  // Function to format status text
  const formatStatus = (status: string): string => {
    if (!status || status === 'off') return 'Not Connected';
    
    // Handle Ultravox session statuses
    const statusMap: { [key: string]: string } = {
      AGENT_SPEAKING: 'Speaking',
      AGENT_LISTENING: 'Listening',
      AGENT_THINKING: 'Thinking',
      AGENT_READY: 'Ready',
      USER_SPEAKING: 'Listening',
      ERROR: 'Error',
    };

    return statusMap[status] || status;
  };

  // Function to add animation class
  const getAnimationClass = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('speaking')) return 'animate-pulse';
    if (statusLower.includes('thinking')) return 'animate-bounce';
    if (statusLower.includes('listening')) return 'animate-pulse';
    return '';
  };

  return (
    <div className="flex flex-col border border-[#2A2A2A] rounded-r-[1px] p-4 w-full lg:w-1/3">
      <div className="mt-2">
        <h2 className="text-xl font-semibold mb-2">Call Status</h2>
        <div className="flex items-center space-x-2 mb-4">
          {/* Status indicator dot */}
          <div 
            className={`w-2 h-2 rounded-full ${getStatusDotColor(status)} ${getAnimationClass(status)}`}
          />
          <p className="text-lg font-mono text-gray-400">
            Status: {' '}
            <span className={`${getStatusColor(status)} text-base ${getAnimationClass(status)}`}>
              {formatStatus(status)}
            </span>
          </p>
        </div>
        
        {/* Future Features */}
        {/* TODO <p className="font-mono text-gray-400">Latency: <span className="text-gray-500">N/A</span></p> */}
        {/* TODO <p className="font-mono">00:00</p> */}
      </div>

      {/* Children (Assessment Notes) */}
      <div className="mt-4">
        {children}
      </div>
    </div>
  );
};

export default CallStatus;
