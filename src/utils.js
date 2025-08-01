



class emphemralHelper{

    constructor(interaction, content){
        this.interaction = interaction;
        this.content = content;
        this.sentEmphemral = false
        this.sendEmphemralMessage = null;
    }


    //basically this function is to stop discord from wanting to kill itself
    //discord expects a reply to be sent within 3 seconds of the interaction being created
    //so this function will send a reply after 3 seconds if it hasn't been sent already
    //I will prob modify this later, just know it exists
    startTimer(timeout = 3000){
        if(this.sentEmphemral) return;
        this.sendEmphemralMessage = setTimeout(() => {
            this.interaction.reply({ content: this.content, ephemeral: true });
            this.sentEmphemral = true;
        }, timeout);
    }

    clearTimer(){
        if(this.sendEmphemralMessage){
            clearTimeout(this.sendEmphemralMessage);
            this.sendEmphemralMessage = null;
        }
    }

    sentEmphemralMessage(){
        return this.sentEmphemral;
    }

}