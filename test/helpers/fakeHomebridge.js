class FakeUser{
    constructor(){
        this.storage = "../sotragePath";
    }

    storagePath (){
        return this.storage;
    }
}

class FakeHomebridge{

    constructor () {
        this.user = new FakeUser();
    }


}

module.exports = FakeHomebridge;
