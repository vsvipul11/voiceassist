// app/api/ultravox/create-agent-call/route.ts

import { NextRequest, NextResponse } from 'next/server';

// Your Ultravox API key should be stored in environment variables
const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const ULTRAVOX_BASE_URL = 'https://api.ultravox.ai/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agentId,
      templateContext,
      selectedTools,
      systemPrompt,
      voice,
      temperature,
      maxDuration,
      metadata,
    } = body;

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Prepare the agent call configuration
    const agentCallConfig = {
      templateContext: templateContext || {},
    };

    // Add optional overrides if provided
    if (systemPrompt) agentCallConfig.systemPrompt = systemPrompt;
    if (voice) agentCallConfig.voice = voice;
    if (temperature !== undefined) agentCallConfig.temperature = temperature;
    if (maxDuration) agentCallConfig.maxDuration = maxDuration;
    if (metadata) agentCallConfig.metadata = metadata;
    if (selectedTools && selectedTools.length > 0) {
      agentCallConfig.selectedTools = selectedTools;
    }

    // Create agent call with Ultravox API
    const response = await fetch(`${ULTRAVOX_BASE_URL}/agents/${agentId}/calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${`pBfKabXX.4pIs4Xl66NCkPxQJ2NaUvLUa2Pa5VP9u`}`,
         'X-API-Key': `pBfKabXX.4pIs4Xl66NCkPxQJ2NaUvLUa2Pa5VP9u`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentCallConfig),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Ultravox Agent API error:', errorData);
      throw new Error(`Ultravox Agent API error: ${response.status} ${response.statusText}`);
    }

    const callData = await response.json();
    
    return NextResponse.json({
      success: true,
      joinUrl: callData.joinUrl,
      callId: callData.callId,
    });

  } catch (error) {
    console.error('Error creating Ultravox agent call:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create agent call',
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve call status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json(
        { success: false, error: 'Call ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${ULTRAVOX_BASE_URL}/calls/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ULTRAVOX_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get call status: ${response.statusText}`);
    }

    const callData = await response.json();
    
    return NextResponse.json({
      success: true,
      call: callData,
    });

  } catch (error) {
    console.error('Error getting call status:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get call status',
      },
      { status: 500 }
    );
  }
}