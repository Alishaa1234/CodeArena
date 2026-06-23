const validator =require("validator");

// req.body 

const validate = (data)=>{
   
    const mandatoryField = ['firstName',"emailId",'password'];

    const IsAllowed = mandatoryField.every((k)=> Object.keys(data).includes(k));

    if(!IsAllowed) {
        const error = new Error("Some Field Missing");
        error.statusCode = 400;
        throw error;
    }

    if(!validator.isEmail(data.emailId)) {
        const error = new Error("Invalid Email");
        error.statusCode = 400;
        throw error;
    }

    if(!validator.isStrongPassword(data.password, {
        minLength: 8, minLowercase: 1, minUppercase: 0, minNumbers: 0, minSymbols: 0
    })) {
        const error = new Error("Weak Password");
        error.statusCode = 400;
        throw error;
    }
}

module.exports = validate;