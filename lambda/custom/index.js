
// Constants ============================================================================
const Alexa = require('ask-sdk');
const DYNAMODB_TABLE = 'HelloGuruSkillTable';
const debug_on = process.env.DEBUG_ON;
const SKILL_NAME = 'hello guru';

// Messages =============================================================================

const messages = {
  WELCOME: `Welcome to ${SKILL_NAME}. Please tell me your name.`,
  REQUEST_NAME: 'Can you tell me your name?',
  GOODBYE: `I hope ${SKILL_NAME} helped you today. See ya `,
  ERROR: 'Oops, something went wrong. Please try again later.',
  HELP: `${SKILL_NAME} can help you find your mobile phone. Just say 'alexa, ask ${SKILL_NAME} to call my mobile'. What would you like to do?`
};

// Handlers =============================================================================
const LaunchRequestHandler = {
  canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return request.type === 'LaunchRequest' ||
            (request.type === 'IntentRequest' && request.intent.name === 'sayHiIntent');
  },
  handle(handlerInput) {
    debug_on && console.log('lastIntent');
    const request = handlerInput.requestEnvelope.request;
    if (request.type === 'LaunchRequest') { storeSessionAttribute(handlerInput, 'lastIntent', request.type); }
    else if (request.intent.name === 'sayHiIntent') { storeSessionAttribute(handlerInput, 'lastIntent', request.intent.name); }
    
    const storedName = getSessionAttribute(handlerInput, 'name');

    if (storedName == undefined) {
      // If name not stored, request name. Response handled by GetNameHandler
      var speechOutput = messages.REQUEST_NAME;
      storeSessionAttribute(handlerInput, 'lastSpeech', speechOutput);
      return handlerInput.responseBuilder
          .speak(messages.WELCOME)
          .reprompt(speechOutput)
          .getResponse();
    }
    else {
        // If we asked the name before have a personalized welcome message
        var speechOutput = `<say-as interpret-as='interjection'>g'day ${storedName}</say-as>.`;
        speechOutput += '<break time=\'1s\'/> What can I do for you today?';
        storeSessionAttribute(handlerInput, 'lastSpeech', speechOutput);
        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt(speechOutput)
            .getResponse();
    }
  }
}

const GetNameHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;// might need a .request too
    return (request.type === 'IntentRequest' && request.intent.name === 'GetNameIntent');
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    let spokenName = request.intent.slots.name.value;

    storeSessionAttribute(handlerInput, 'lastIntent', request.intent.name);

    debug_on && console.log('Spoken name: ', spokenName);
    storeSessionAttribute(handlerInput, 'name', spokenName);

    // Ask user to confirm the number was heard correctly - response handled by either YesIntent or NoIntent
    const speechOutput = `Nice to meet you ${spokenName}. How can I help you?`;
    const cardOutput = `Nice to meet you ${spokenName}`;
    storeSessionAttribute(handlerInput, 'lastSpeech', speechOutput);
    return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt('What can I do for you?')
        .withSimpleCard(SKILL_NAME, cardOutput)
        .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      let speechOutput = messages.HELP;
      storeSessionAttribute(handlerInput, 'lastSpeech', speechOutput);
      storeSessionAttribute(handlerInput, 'lastIntent', request.intent.name);
      return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt(speechOutput)
        .getResponse();
  }
};

const ExitHandler = {
  canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return request.type === 'IntentRequest' &&
       (request.intent.name === 'AMAZON.CancelIntent' || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const name = getSessionAttribute(handlerInput, 'name');

    var speechOutput = messages.GOODBYE;
    if (name != undefined) {
      speechOutput += ' ' + name;
    }

    speechOutput += '.';

    storeSessionAttribute(handlerInput, 'lastSpeech', speechOutput);
    storeSessionAttribute(handlerInput, 'lastIntent', request.intent.name);

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .getResponse();
  },
};

const SystemExceptionHandler = {
  canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return request.type === 'System.ExceptionEncountered';
  },
  handle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      console.log(`System exception encountered: ${request.reason}`);
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
      const { request } = handlerInput.requestEnvelope;
      console.log(`SESSION-ENDED: ${request.reason}`);
      return handlerInput.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
      return true;
  },
  handle(handlerInput, error) {
      console.log(`Error handled: ${error.message}`);
      return handlerInput.responseBuilder.speak(messages.ERROR).getResponse();
  }
};

const FallbackHandler = {
  canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
      storeSessionAttribute(handlerInput, 'lastSpeech', messages.UNKNOWN);
      return handlerInput.responseBuilder.speak(messages.UNKNOWN).reprompt(messages.UNKNOWN).getResponse();
  }
};

const SkillDisabledEventHandler = {
  canHandle(handlerInput) {
      const request = handlerInput.requestEnvelope.request;
      return (request.type === 'AlexaSkillEvent.SkillDisabled');
  },
  async handle(handlerInput) {
      debug_on && console.log('SkillDisabledEvent|Deleting persistent attribute.');
      await handlerInput.attributesManager.deletePersistentAttributes();
      return handlerInput.responseBuilder.getResponse();
  }
};

// =========================================================================================
// Helper functions

// getSessionAttribute: Return the value of the session attribute provided as input
function getSessionAttribute(handlerInput, attribute_name) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  return sessionAttributes[attribute_name];
}

// storeSessionAttribute: Store attribute_value in attribute_name of session attributes.
function storeSessionAttribute(handlerInput, attribute_name, attribute_value) {
   const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
   sessionAttributes[attribute_name] = attribute_value;
   handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

// Interceptors ========================================================

// InitialiseAttributesInterceptor: If a new session (launch or one-shot), initialise persisted attributes.
//
const NewSessionInterceptor = {
  async process(handlerInput) {
      if (handlerInput.requestEnvelope.session.new) {
        debug_on && console.log('NewSessionInterceptor|New session|Initialising session attributes');
        
        var persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes();
        var sessionAttributes = persistentAttributes || {};

        if (Object.keys(sessionAttributes).length === 0) {
            debug_on && console.log('NewSessionInterceptor|New session|Initialising session attributes');
            //Initialize default values
            sessionAttributes.lastIntent = null;
            sessionAttributes.lastSpeech = null;
            //sessionAttributes.retryCount = 0;
            sessionAttributes.totalLaunchCount = 0;
            sessionAttributes.name = undefined;
        }
        else {
            debug_on && console.log('NewSessionInterceptor|New session|Updating session attributes');
            sessionAttributes.totalLaunchCount = sessionAttributes.totalLaunchCount + 1;
        }

        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
      }
  }
};

// SavePersistentAttributesInterceptor: Ensure that persistent attributes are saved on every response
//
const SavePersistentAttributesInterceptor = {
  async process(handlerInput) {
      // Set timestamp of last usage
      let lastUseTimestamp = new Date(handlerInput.requestEnvelope.request.timestamp).getTime();
      storeSessionAttribute(handlerInput, 'lastUseTimestamp', lastUseTimestamp);

      let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
      handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);
      debug_on && console.log('SavePersistentAttributesInterceptor|Saving attributes on response');
      await handlerInput.attributesManager.savePersistentAttributes();
  }
};

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    GetNameHandler,
    HelpHandler,
    FallbackHandler,
    ExitHandler,
    SystemExceptionHandler,
    SessionEndedRequestHandler,
    SkillDisabledEventHandler
  )
  .addRequestInterceptors(NewSessionInterceptor)
  .addResponseInterceptors(SavePersistentAttributesInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withTableName(DYNAMODB_TABLE)
  .withAutoCreateTable(true)
  .lambda();
