const axios = require('axios');


const getLanguageById = (lang)=>{

    const language = {
        "c++":54,
        "java":62,
        "javascript":63
    }


    return language[lang.toLowerCase()];
}


const submitBatch = async (submissions)=>{


const options = {
  method: 'POST',
  url: 'https://judge0-ce.p.rapidapi.com/submissions/batch',
  params: {
    base64_encoded: 'false'
  },
  headers: {
    'x-rapidapi-key': 'c39a80d8b3mshac16b3fb49f4924p1c5d75jsnb066d255ed5f',
    'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
    'Content-Type': 'application/json'
  },
  data: {
    // already created submissions array
    submissions
  }
};

async function fetchData() {
	try {
		const response = await axios.request(options);
		return response.data;
	} catch (error) {
		console.error(error);
	}
}

 return await fetchData();

}

const submitToken=async(resultToken)=>{
    

const options = {
  method: 'GET',
  url: 'https://judge0-ce.p.rapidapi.com/submissions/batch',
  params: {
    tokens: resultToken.join(','),
    base64_encoded: 'false',
    fields: '*'
  },
  headers: {
    'x-rapidapi-key': 'c39a80d8b3mshac16b3fb49f4924p1c5d75jsnb066d255ed5f',
    'x-rapidapi-host': 'judge0-ce.p.rapidapi.com'
  }
};

async function fetchData() {
	try {
		const response = await axios.request(options);
		return response.data;
	} catch (error) {
		console.error(error);
	}
}

const result=await fetchData();
const isResultObtained=result.submissions.every((r)=>r.status_id>2);
if(isResultObtained)
    return result.submissions;



module.exports = {getLanguageById,submitBatch,submitToken};
}