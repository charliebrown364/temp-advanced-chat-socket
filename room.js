class Room {

    constructor(name, id, owner) {
        this.name = name;
        this.id = id;
        this.owner = owner;
        this.people = [];
        this.status = 'available';
    }

    addPerson(personID) {
        if (this.status == 'available') {
            this.people.push(personID);
        }
    }

}

export default Room;