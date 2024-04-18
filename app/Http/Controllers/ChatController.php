<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Chat;
use App\Services\OpenAIService;
use App\Services\AnthropicService;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    protected $openAIService;

    public function __construct(OpenAIService $openAIService)
    {
        $this->openAIService = $openAIService;
    }

    public function index(Request $request)
    {
        $selectedSessionId = $request->get('session_id');
    
        // Fetch distinct chat session IDs along with the first message as the title
        $sessions = Chat::select('chat_session_id', Chat::raw('MIN(SUBSTRING(user_message, 1, 50)) as title'), Chat::raw('MIN(created_at) as first_message_time'))
                         ->groupBy('chat_session_id')
                         ->orderBy('first_message_time', 'asc')
                         ->get();
    
        if (!$selectedSessionId) {
            
            // If no session_id is provided, start a new one
            $selectedSessionId = Str::uuid()->toString();
            session(['chat_session_id' => $selectedSessionId]);
            // Since this is a new session, there won't be any messages to display
            $chats = [];
        } else {
            
            // Fetch messages from the selected session
            $chats = Chat::where('chat_session_id', $selectedSessionId)->get();
            session(['chat_session_id' => $selectedSessionId]);
        }
        return view('chat', compact('sessions', 'chats', 'selectedSessionId'));
    }
    

    public function store(Request $request)
    {
        // echo '<pre>'; print_r($request->input());
        $userMessage = $request->input('message');
        // Check if session_id is provided in the request, otherwise generate a new one
        $chatSessionId = $request->input('session_id');

        if( $chatSessionId !== session('chat_session_id')){ return response()->json(['success' => 0, 'message' => 'chat session is not matching']);}

        session(['chat_session_id' => $chatSessionId]);

        // Your existing code to handle the message and AI response
        $conversationHistory = Chat::where('chat_session_id', $chatSessionId)->get()->map(function ($chat) {
            return [
                ['role' => 'user', 'content' => $chat->user_message],
                ['role' => 'assistant', 'content' => $chat->ai_response],
            ];
        })->collapse()->toArray();

        $conversationHistory[] = ['role' => 'user', 'content' => $userMessage];

        $model = $request->input('model', 'gpt-3.5-turbo'); // Default to gpt-3.5-turbo if not provided
        $aiService = $this->getAIService($model);
        $responseBody = $aiService->generateResponse($conversationHistory, $model);

        $aiResponse = $responseBody['ai_response'];

        // Extract token counts from the OpenAI response if available
        $promptTokens = $responseBody['prompt_tokens'];
        $completionTokens = $responseBody['completion_tokens'];
        $totalTokens = $responseBody['total_tokens'];

         // Dynamically set the service_by attribute based on the selected AI model
        if (str_contains($model, 'claude')) {
            $service_by = 'anthropic';
        } else {
            $service_by = 'openai';
        }

        $chat = new Chat();
        $chat->user_message = $userMessage;
        $chat->ai_response = $aiResponse;
        $chat->chat_session_id = $chatSessionId;

        $chat->ai_model = $model;
        $chat->service_by = $service_by;
        $chat->prompt_tokens = $promptTokens;
        $chat->completion_tokens = $completionTokens;
        $chat->total_tokens = $totalTokens;

        $chat->save();
        
        // Return the AI response along with the session_id to ensure the frontend knows which session is active
        return response()->json(['ai_response' => $aiResponse, 'session_id' => $chatSessionId]);
    }

    private function getAIService($model)
    {
        // You might want to add logic to determine the service based on the model string
        if (str_contains($model, 'claude')) {
            return new AnthropicService();
        } else {
            return new OpenAIService();
        }
    }

    

    
}
