import store from './redux/store';
import {SET_ERROR} from "./redux/error";
import {LOGOUT} from "./redux/users";

const baseURL = '/api/';
const headers = new Headers();

var cookie;

headers.set('Content-Type', 'application/json');

const reqConf = {
   headers: headers,
   credentials: 'include',
};

function safeFetch(...params) {
   return fetch(...params)
      .then(res => {
         if (res.status === 401) {
            store.dispatch({ type: SET_ERROR, message: 'Not Authorized', style: 'danger' });
            store.dispatch({ type: LOGOUT });
            return Promise.reject([{tag: 'notAuthorized'}]);
         }

         else if (res.status === 404) {
            store.dispatch({ type: SET_ERROR, message: 'Page not Found', style: 'danger' });
            return Promise.reject([{tag: 'pageNotFound'}]);
         }
         else if (res.status === 500) {
            store.dispatch({ type: SET_ERROR, message: 'Server Error', style: 'danger' });
            return Promise.reject([{tag: 'serverErr'}]);
         }
         return res.ok ? res : res.json().then((body) => Promise.reject(body))
      })
      .catch((err) => {
         if (err.toString() === 'TypeError: Failed to fetch')
            return Promise.reject(['Server Connect Error']);
         else {
            // console.log('err:', err);
            // let msgs = err.map((e) => errorTranslate(e.tag));
            // console.log('errMsgs:', msgs);
            return Promise.reject(err.map(e => errorTranslate(e.tag)));
         }
      })
}


// Helper functions for the common request types

/**
 * make a post request
 * @param {string} endpoint
 * @param {Object} body
 * @returns {Promise}
 */
export function post(endpoint, body) {
   return safeFetch(baseURL + endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...reqConf
   });
}

/**
 * make a put request
 * @param {string} endpoint
 * @param {Object} body
 * @returns {Promise}
 */
export function put(endpoint, body) {
   return safeFetch(baseURL + endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...reqConf
   })
}

/**
 * make a get request
 * @param {string} endpoint
 * @returns {Promise}
 */
export function get(endpoint) {
   return safeFetch(baseURL + endpoint, {
      method: 'GET',
      ...reqConf
   })
}

export function del(endpoint) {
   return safeFetch(baseURL + endpoint, {
      method: 'DELETE',
      ...reqConf
   })
}

// Functions for performing the api requests

/**
 * Sign a user into the service, returns the user data
 * @param {{user: string, password: string}} cred
 */
export function signIn(cred) {
   console.log("API signin with ", cred);
   return post("Session", cred)
      .then(res => {
         if (res.ok) {
            let location = res.headers.get("Location").split('/');
            cookie = location[location.length - 1];
            return get("Session/" + cookie)
         }
         else
            return createErrorPromise(res);
      })
      .then(res => res.json())
      .then(res => get('User/' + res.userId))
      .then(userResponse => userResponse.json())
      .then(res => res[0]);
}

// Handle res with non-200 status by returning a Promise that rejects,
// with reason: array of one or more error strings suitable for display.
function createErrorPromise(res) {
   console.log('create error promise')
   if (res.status === 400 || res.status === 401
    || res.status === 402 || res.status === 403) {
      return Promise.resolve(res)
         .then(res => res.json())
         .then(errorList => {
            Promise.reject(errorList.length
            ? errorList.map(err => errorTranslate(err.tag))
            : ["Unknown error"])});
   }
   else
      return Promise.reject(["Unknown error"]);
}

/**
 * @returns {Promise} result of the sign out request
 */
export function signOut() {
   return del("Session/" + cookie);
}

/**
 * Register a user
 * @param {Object} user
 * @returns {Promise}
 */
export function register(user) {
   return post("User", user)
      .then(res => {
         if (res.ok) {
            return signIn(user);
         }
         else {
            createErrorPromise(res);
         }
      })
}

/**
 * Modify a user
 * @param {Integer} userId,
 * @param {Object} body,
 * @returns {Promise}
 */
export function modifyUser(userId, body) {
   return put(`User/${userId}`, body)
      .then(res => {
         if (res.ok) {
            store.dispatch({ type: SET_ERROR, message: 'Password Changed', style: 'success'});
            return get(`User/${userId}`);
         }
         else
            return createErrorPromise(res);
      })
      .then(res => res.json());
}

/**
 * Get all users
 * @param {String} email,
 * @returns {Promise}
 */
export function getUsers(email) {
   let endpoint = 'User';
   
   if (email)
      endpoint += `?email=${email}`;
      
   console.log("getUsers endpoint:", endpoint);
   
   return get(endpoint)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Gets a section's topics
 * @param {Integer} sectionId    // optional argument
 * @returns {Promise}
 */
export function getTopics(sectionId) {
   let endpoint = 'Topic';

   if (sectionId) // add sectionId query if not null
      endpoint += `?sectionId=${sectionId}`;
      
   console.log("Endpoint?", endpoint);

   return get(endpoint)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Creates a topic
 * @param {Object} body
 * @returns {Promise}
 */
export function createTopic(body) {
   return post('Topic', body)
      .then(res => {
         if (res.ok) {
            const location = res.headers.get("Location").split('/');
            const topicId = location[location.length - 1];

            return get(`Topic/${topicId}`);
         }
         else
            return createErrorPromise(res);
      })
      .then(res => res.json())
}

/**
 * Gets a topic
 * @param {Integer} topicId
 * @returns {Promise}
 */
export function getTopic(topicId) {
   return get(`Topic/${topicId}`)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Modifies a topic
 * @param {Integer} topicId
 * @param {Object} body
 * @returns {Promise}
 */
export function modifyTopic(topicId, body) {
   return put(`Topic/${topicId}`, body)
      .then(res => {
         if (res.ok) {
            return get(`Topic/${topicId}`);
         }
         else
            return createErrorPromise(res);
      })
      .then(res => res.json());
}

/**
 * Deletes a topic
 * @param {Integer} topicId
 * @returns {Promise}
 */
export function deleteTopic(topicId) {
   return del(`Topic/${topicId}`)
      .then(res => {
         if (res.ok) {
            return topicId;
         }
         else
            return createErrorPromise(res);
      });
}

/**
 * Gets a topic's activities
 * @param {Integer} topicId
 * @returns {Promise}
 */
export function getActivities(topicId) {
   return get(`Topic/${topicId}/Activities`)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Gets exercises
 * @returns {Promise}
 */
export function getExercises(sectionId) {
   let endpoint = 'Exercise';

   /* add query paremeters if they exist */
   if (sectionId) {     // check if queries exist
      endpoint += '?';
      endpoint = addQueryArg(endpoint, 'sectionId', sectionId);
   }

   return get(endpoint)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Creates an exercise
 * @param {object} body
 * @returns {Promise}
 */
export function createExercise(body) {
   return post('Exercise', body)
      .then(res => {
         if (res.ok) {
            const location = res.headers.get("Location").split('/');
            const exerciseId = location[location.length - 1];

            return get(`Exercise/${exerciseId}`);
         }
         else
            return createErrorPromise(res);
      })
      .then(res => res.json())
}

/**
 * Gets an exercise
 * @param {Integer} exerciseId
 * @returns {Promise}
 */
export function getExercise(exerciseId) {
   return get(`Exercise/${exerciseId}`)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Modifies an exercise
 * @param {Integer} exerciseId
 * @param {Object} body
 * @returns {Promise}
 */
export function modifyExercise(exerciseId, body) {
   return put(`Exercise/${exerciseId}`, body)
      .then(res => {
         if (res.ok) {
            return get(`Exercise/${exerciseId}`);
         }
         else
            return createErrorPromise(res);
      })
      .then(res => res.json());
}

/**
 * Deletes an exercise
 * @param {Integer} exerciseId
 * @returns {Promise}
 */
export function deleteExercise(exerciseId) {
   return del(`Exercise/${exerciseId}`)
      .then(res => {
         return res.ok ? exerciseId : createErrorPromise(res);
      })
      .then(res => res.json());
}

/**
 * Grades an exercise
 * @param {Integer} exerciseId
 * @param {Object} body
 * @returns {Promise}
 */
export function modifyExerciseGrade(exerciseId, body) {
   return put(`Exercise/${exerciseId}/Grade`, body)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Gets videos
 * @returns {Promise}
 */
export function getVideos(sectionId) {
   let endpoint = 'Video';

   /* add query paremeters if they exist */
   if (sectionId) {     // check if queries exist
      endpoint += '?';
      endpoint = addQueryArg(endpoint, 'sectionId', sectionId);
   }
   return get(endpoint)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Creates a video
 * @param {object} body
 * @returns {Promise}
 */
export function createVideo(body) {
   return post('Video', body)
      .then(res => {
         if (res.ok) {
            const location = res.headers.get("Location").split('/');
            const videoId = location[location.length - 1];

            return get(`Video/${videoId}`);
         }
         else
            return createErrorPromise(res);
      })
      .then(res => res.json())
}

/**
 * Gets a video
 * @param {Integer} videoId
 * @returns {Promise}
 */
export function getVideo(videoId) {
   return get(`Video/${videoId}`)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Modifies a video
 * @param {Integer} videoId
 * @param {Object} body
 * @returns {Promise}
 */
export function modifyVideo(videoId, body) {
   return put(`Video/${videoId}`, body)
      .then(res => {
         if (res.ok) {
            return get(`Video/${videoId}`);
         }
         else
            return createErrorPromise(res);
      })
      .then(res => res.json());
}

/**
 * Deletes a video
 * @param {Integer} videoId
 * @returns {Promise}
 */
export function deleteVideo(videoId) {
   return del(`Video/${videoId}`)
      .then(res => {
         if (res.ok) {
            return videoId;
         }
         else
            return createErrorPromise(res);
      });
}

/**
 * Gets documents
 * @returns {Promise}
 */
export function getDocuments(sectionId) {
   let endpoint = 'Document';

   /* add query paremeters if they exist */
   if (sectionId) {     // check if queries exist
      endpoint += '?';
      endpoint = addQueryArg(endpoint, 'sectionId', sectionId);
   }

   return get(endpoint)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Creates a document
 * @param {object} body
 * @returns {Promise}
 */
export function createDocument(body) {
   return post('Document', body)
      .then(res => {
         if (res.ok) {
            const location = res.headers.get("Location").split('/');
            const documentId = location[location.length - 1];

            return get(`Document/${documentId}`);
         }
         else
            return createErrorPromise(res);
      })
      .then(res => res.json())
}

/**
 * Gets a document
 * @param {Integer} documentId
 * @returns {Promise}
 */
export function getDocument(documentId) {
   return get(`Document/${documentId}`)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Modifies a document
 * @param {Integer} documentId
 * @param {Object} body
 * @returns {Promise}
 */
export function modifyDocument(documentId, body) {
   return put(`Document/${documentId}`, body)
      .then(res => {
         if (res.ok) {
            return get(`Document/${documentId}`);
         }
         else
            return createErrorPromise(res);
      })
      .then(res => res.json());
}

/**
 * Deletes a document
 * @param {Integer} documentId
 * @returns {Promise}
 */
export function deleteDocument(documentId) {
   return del(`Document/${documentId}`)
      .then(res => {
         if (res.ok) {
            return documentId;
         }
         else 
            return createErrorPromise(res);
      });
}

/**
 * Gets a section
 * @param {Integer} term   // optional argument
 * @param {Integer} name   // optional argument
 * @returns {Promise}
 */
export function getSections(term, name) {
   let endpoint = 'Section';

   /* add query paremeters if they exist */
   if (term || name) {     // check if queries exist
      endpoint += '?';
      endpoint = addQueryArg(endpoint, 'term', term);
      endpoint = addQueryArg(endpoint, 'name', name);
   }

   console.log(`getSections(term:${term}, name:${name})`);
   console.log(`endpoint:${endpoint}`);
   return get(endpoint)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Creates a section
 * @param {Object} body
 * @returns {Promise}
 */
export function createSection(body) {
   return post('Section', body)
      .then(res => {
         if (res.ok) {
            const location = res.headers.get("Location").split('/');
            const sectionId = location[location.length - 1];

            return get(`Section/${sectionId}`);
         }
         else {
            return createErrorPromise(res);
         }
      })
      .then(res => res.json())
}

/**
 * Gets a section
 * @param {Integer} sectionId
 * @returns {Promise}
 */
export function getSection(sectionId) {
   return get(`Section/${sectionId}`)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Modifies a section
 * @param {Integer} sectionId
 * @param {Object} body
 * @returns {Promise}
 */
export function modifySection(sectionId, body) {
   return put(`Section/${sectionId}`, body)
      .then(res => {
         if (res.ok) {
            return get(`Section/${sectionId}`);
         }
         else {
            return createErrorPromise(res);
         }
      })
      .then(res => res.json());
}

/**
 * Deletes a section
 * @param {Integer} sectionId
 * @returns {Promise}
 */
export function deleteSection(sectionId) {
   return del(`Section/${sectionId}`)
      .then(res => {
         if (res.ok) {
            return sectionId;
         }
         else {
            return createErrorPromise(res);
         }
      });
}

/**
 * Gets a user's progress
 * @param {Integer} userId
 * @returns {Promise}
 */
export function getUserProgress(userId) {
   return get(`Progress/${userId}`)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Modifies a user's progress
 * @param {Integer} userId
 * @param {Object} body
 * @returns {Promise}
 */
export function modifyUserProgress(userId, body) {
   return put(`Progress/${userId}`, body)
      .then(res => {
         if (res.ok) {
            return get(`Progress/${userId}`);
         }
         else {
            return createErrorPromise(res);
         }
      })
      .then(res => res.json());
}

/**
 * Gets users enrolled in the section(s)
 * @param {Integer} userId    // optional
 * @param {Integer} sectionId // optional
 * @returns {Promise}
 */
export function getEnrollment(userId, sectionId) {
   let endpoint = 'Enrollment';
   console.log(`getEnrollment userId: ${userId}, sectionId: ${sectionId}`);

   /* add query parameters if they exist */
   if (userId || sectionId) {     // check if queries exist
      endpoint += '?';
      console.log('endpoint1: ', endpoint);
      endpoint = addQueryArg(endpoint, 'userId', userId);
      console.log('endpoint2: ', endpoint);
      endpoint = addQueryArg(endpoint, 'sectionId', sectionId);
      console.log('endpoint3: ', endpoint);
   }

   console.log('endpoint4: ', endpoint);

   return get(endpoint)
      .then(res => {
         return res.ok ? res.json() : createErrorPromise(res);
      })
      .then(res => res);
}

/**
 * Enrolling student into section
 * @param {Object} body
 * @returns {Promise}
 */
export function createEnrollment(body) {
   return post('Enrollment', body)
      .then(res => {
         if (res.ok) {
            const userId = body.userId;
            const sectionId = body.sectionId;

            return getEnrollment(userId, sectionId);
         }
         else {
            return createErrorPromise(res);
         }
      });
}

/**
 * Deletes a section
 * @param {Integer} userId    
 * @param {Integer} sectionId 
 * @returns {Promise}
 */
export function deleteEnrollment(body) {
   return del(`Enrollment/${body.sectionId}/${body.userId}`)
      .then(res => {
         if (!res.ok) {
            return createErrorPromise(res);
         }
      });
}

const errMap = {
   en: {
      missingField: 'Field missing from request: ',
      notAuthorized: 'Not authorized',
      badValue: 'Field has bad value: ',
      notFound: 'Entity not present in DB',
      badLogin: 'Email/password combination invalid',
      dupEmail: 'Email duplicates an existing email',
      noTerms: 'Acceptance of terms is required',
      forbiddenRole: 'Role specified is not permitted.',
      noOldPwd: 'Change of password requires an old password',
      oldPwdMismatch: 'Old password that was provided is incorrect.',
      oldPasswordMismatch: 'Old password that was provided is incorrect.',
      dupTitle: 'Conversation title duplicates an existing one',
      dupEnrollment: 'Duplicate enrollment',
      forbiddenField: 'Field in body not allowed.',
      queryFailed: 'Query failed (server problem).',
      cnnErr: 'Server Connect Error',
      pageNotFound: "Page not found.",
      serverErr: "Server Error"
   }
};

/**
 * TODO perhaps should return a Promise to conform with the
 * rest of the api functions
 *
 * @param {string} errTag
 * @param {string} lang
 */
export function errorTranslate(errTag, lang = 'en') {
   console.log('errTag:', errTag)
   store.dispatch({ type: SET_ERROR, message: errMap[lang][errTag], style: 'danger' });
   // console.log(errMap[lang][errTag])
   return errMap[lang][errTag] || 'Unknown Error!';
}

function addQueryArg(endpoint, query, arg) {
   let newEndpoint = endpoint;
   const lastChar = endpoint[endpoint.length - 1];

   if (!arg)               // no argument exists
      return endpoint;

   if (lastChar !== '?')   // previous argument exists
      newEndpoint += '&';
      
   newEndpoint += `${query}=${arg}`;
   return newEndpoint;
}
