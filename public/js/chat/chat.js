$(document).ready(function() {
    
    $('#sendButton').click(function() {
        var userInput = $('#userInput').val();
        var modelSelected = $('#modelSelection').val(); // Get the selected model
        var sessionInput = $('#sessionInput').val(); // Get the session_id value
        $('#userInput').val(''); // Clear input field
        appendMessage1(userInput, 'user-message');
        

        // Show the spinnersend-button-pnt
        $('.spinner-border').show();
        $('.send-button-pnt').hide();

        // Send AJAX request using jQuery
        $.ajax({
            url: '/chat',
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify({
                message: userInput,
                session_id: sessionInput, // Use the session_id from the hidden input
                model: modelSelected // Send the selected model to the backend
            }),
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
                'Content-Type': 'application/json'
            },
            success: function(data) {
                //appendMessage(data.ai_response, 'ai-message');
                appendAIMessage(data.ai_response);
                // Construct a meaningful title from the user's input and AI's response
                var userSnippet = userInput.length > 30 ? userInput.substring(0, 30) + '...' : userInput;
                var aiSnippet = data.ai_response.length > 30 ? data.ai_response.substring(0, 30) + '...' : data.ai_response;
                var sessionTitle = userSnippet + ' ... ' + aiSnippet;

                var isNewSession = true;
                $('.list-group a').each(function() {
                    if ($(this).attr('href').includes(data.session_id)) {
                        isNewSession = false;
                        // Update the title for an existing session
                        $(this).text(sessionTitle);
                        return false; // break the loop
                    }
                });

                // If it's a new session, add it to the list with the constructed title
                if (isNewSession) {
                    var newSessionLink = $('<a>')
                        .addClass('list-group-item list-group-item-action')
                        .attr('href', '/chat?session_id=' + data.session_id)
                        .text(sessionTitle); // Use the constructed title

                    $('.list-group').prepend(newSessionLink); // Add the new session link to the top of the list
                }

                // Update the hidden session input and the URL without reloading the page
                $('#sessionInput').val(data.session_id);
                if (!window.location.href.includes(data.session_id)) {
                    window.history.pushState({}, '', '/chat?session_id=' + data.session_id);
                }

                // Hide the spinner
                $('.spinner-border').hide();
                $('.send-button-pnt').show();
                },
                error: function() {
                    // Hide the spinner in case of error as well
                    $('.spinner-border').hide();
                    $('.send-button-pnt').show();
                }
        });

    });

    $('#userInput').keydown(function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            $('#sendButton').click();
        }
    });

    function appendMessage1(message, className) {
        var messageElement = $('<div>').addClass('message ' + className).text(message);
        $('#chatBox').append(messageElement);
        $('#chatBox').scrollTop($('#chatBox')[0].scrollHeight);
    }

 // Function to append AI messages with formatted code blocks and copy buttons
 function appendAIMessage(aiResponse) {
   
    // Create the message element and append it to the chat box
    let messageElement = $('<div>').addClass('message ai-message').html('<strong>AI:</strong> ' + aiResponse);
    let copyBtn = $('<button>').addClass('copy-btn btn btn-sm btn-outline-secondary').text('Copy');
    messageElement.append(copyBtn);
    $('#chatBox').append(messageElement);
    $('#chatBox').scrollTop($('#chatBox')[0].scrollHeight);
}


    $('#newChatButton').click(function() {
        // Generate a new session ID
        var newSessionId = generateUUID(); // Function to generate UUID (explained below)
        $('#sessionInput').val(newSessionId); // Update the hidden session ID input
        console.log('newSessionIdZ: ', newSessionId)

        // Clear the chat box
        $('#chatBox').empty();

        // Optional: Refresh the list of chat sessions
        // You might need to make an AJAX call to the server to get the updated list of sessions
        // and update the session links in the .list-group div

        // If you want to reflect the new session in the URL
        window.location.href = '/chat?session_id=' + newSessionId;
    });

 // Event handler for the "Copy" button to copy the entire AI response
 $(document).on('click', '.copy-btn', function() {
    var message = $(this).parent().text();
    copyToClipboard(message);
    showCopyConfirmation($(this));
});
// Event handler for the "Copy Code" button to copy code block content
$(document).on('click', '.copy-code-btn', function() {
    var codeContent = $(this).prev('pre').find('code').text();
    copyToClipboard(codeContent);
    showCopyConfirmation($(this));
});

// Function to copy content to clipboard
function copyToClipboard(content) {
    var $temp = $("<textarea>");
    $("body").append($temp);
    $temp.val(content).select();
    document.execCommand("copy");
    $temp.remove();
}

// Function to show copy confirmation
function showCopyConfirmation($button) {
    var originalText = $button.text();
    $button.text('Copied!').addClass('btn-success').removeClass('btn-outline-secondary');
    setTimeout(function() {
        $button.text(originalText).removeClass('btn-success').addClass('btn-outline-secondary');
    }, 2000);
}

// Function to generate UUID (version 4)
function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime(); //Timestamp
    var d2 = (performance && performance.now && (performance.now()*1000)) || 0; //Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16; //random number between 0 and 16
        if(d > 0){ //Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else { //Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

});