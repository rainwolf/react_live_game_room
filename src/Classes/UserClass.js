import React from 'react';
import crown from '../resources/images/crown.gif';
import scrown from '../resources/images/scrown.gif';
import bcrown from '../resources/images/bcrown.gif';
import kothcrown1 from '../resources/images/kothcrown1.png';
import kothcrown2 from '../resources/images/kothcrown2.png';
import kothcrown3 from '../resources/images/kothcrown3.png';
import kothcrown4 from '../resources/images/kothcrown4.png';
import kothcrown5 from '../resources/images/kothcrown5.png';
import kothcrown6 from '../resources/images/kothcrown6.png';
import kothcrown7 from '../resources/images/kothcrown7.png';
import kothcrown8 from '../resources/images/kothcrown8.png';
import kothcrown9 from '../resources/images/kothcrown9.png';
import kothcrown10 from '../resources/images/kothcrown10.png';
import kothcrown11 from '../resources/images/kothcrown11.png';
import kothcrown12 from '../resources/images/kothcrown12.png';
import kothcrown13 from '../resources/images/kothcrown13.png';
import kothcrown14 from '../resources/images/kothcrown14.png';
import kothcrown15 from '../resources/images/kothcrown15.png';
import kothcrown16 from '../resources/images/kothcrown16.png';
import kothcrown17 from '../resources/images/kothcrown17.png';
import kothcrown18 from '../resources/images/kothcrown18.png';
import kothcrown19 from '../resources/images/kothcrown19.png';
import kothcrown20 from '../resources/images/kothcrown20.png';
import kothcrown21 from '../resources/images/kothcrown21.png';
import kothcrown22 from '../resources/images/kothcrown22.png';
import kothcrown23 from '../resources/images/kothcrown23.png';
import kothcrown24 from '../resources/images/kothcrown24.png';
import kothcrown25 from '../resources/images/kothcrown25.png';
import kothcrown26 from '../resources/images/kothcrown26.png';
import kothcrown27 from '../resources/images/kothcrown27.png';
import kothcrown28 from '../resources/images/kothcrown28.png';
import kothcrown29 from '../resources/images/kothcrown29.png';
import kothcrown30 from '../resources/images/kothcrown30.png';
import kothcrown31 from '../resources/images/kothcrown31.png';
import kothcrown32 from '../resources/images/kothcrown32.png';
import kothcrown33 from '../resources/images/kothcrown33.png';
import kothcrown34 from '../resources/images/kothcrown34.png';
import kothcrown35 from '../resources/images/kothcrown35.png';
import kothcrown36 from '../resources/images/kothcrown36.png';
import ratings_gray from '../resources/images/ratings_gray.gif'
import ratings_green from '../resources/images/ratings_green.gif'
import ratings_blue from '../resources/images/ratings_blue.gif'
import ratings_yellow from '../resources/images/ratings_yellow.gif'
import ratings_red from '../resources/images/ratings_red.gif'




const server = "https://www.pente.org";

class User {
    constructor(userdata) {
        this.name = '';
        this.game_ratings = {};
        this.subscriber = 0;
        this.name_color= 0;
        this.crown = 0;
        if (userdata) {
            this.updateUser(userdata);
        } 
    }
    
    newInstance = () => {
        const newUser = new User();
        newUser.name = this.name;
        newUser.game_ratings = this.game_ratings;
        newUser.subscriber = this.subscriber;
        newUser.name_color = this.name_color;
        newUser.crown = this.crown;
        newUser.muted = this.muted;
        newUser.userhtml = newUser.user_html();
        newUser.avatar = newUser.avatar_f();
        return newUser;
    };
    
    updateUser = (userdata) => {
        this.subscriber = userdata.subscriberLevel > 0;
        if (this.subscriber) {
            this.name_color = userdata.nameColor.value;
        }
        this.name = userdata.name;
        let crown = 0;
        for(let i = 0; i<userdata.gameData.length; i++) {
            let gameData = userdata.gameData[i];
            if (gameData.computer === 'Y') { continue; }
            this.game_ratings[gameData.game] = Math.round(gameData.rating);
            if (crown === 0) {
                crown = gameData.tourneyWinner;
            } else if (gameData.tourneyWinner > 0) {
                if (gameData.tourneyWinner < 4) {
                    crown = Math.min(crown, gameData.tourneyWinner);
                } else if (crown > 3) {
                    crown = Math.max(crown, gameData.tourneyWinner);
                }
            }
        }
        this.crown = crown;
        this.userhtml = this.user_html();
        this.avatar = this.avatar_f();
    };
    #rgb2hex = (n) => {
        const b = n & 255, g = (n >> 8) & 255, r = (n >> 16) & 255;
        const f = s => { const h = s.toString(16); if (h.length < 2) { return '0'+h; } else { return h; }};
        // console.log(f(r)+f(g)+f(b))
        return f(r)+f(g)+f(b);
    };

    #crownimage = () => {
        const c = this.crown;
        if (c === 0) { return ""; }
        switch (c) {
            case 1: return <img alt="crown" src={crown}/>;
            case 2: return <img alt="crown" src={scrown}/>;
            case 3: return <img alt="crown" src={bcrown}/>;
            case 4: return <img alt="crown" src={kothcrown1}/>;
            case 5: return <img alt="crown" src={kothcrown2}/>;
            case 6: return <img alt="crown" src={kothcrown3}/>;
            case 7: return <img alt="crown" src={kothcrown4}/>;
            case 8: return <img alt="crown" src={kothcrown5}/>;
            case 9: return <img alt="crown" src={kothcrown6}/>;
            case 10: return <img alt="crown" src={kothcrown7}/>;
            case 11: return <img alt="crown" src={kothcrown8}/>;
            case 12: return <img alt="crown" src={kothcrown9}/>;
            case 13: return <img alt="crown" src={kothcrown10}/>;
            case 14: return <img alt="crown" src={kothcrown11}/>;
            case 15: return <img alt="crown" src={kothcrown12}/>;
            case 16: return <img alt="crown" src={kothcrown13}/>;
            case 17: return <img alt="crown" src={kothcrown14}/>;
            case 18: return <img alt="crown" src={kothcrown15}/>;
            case 19: return <img alt="crown" src={kothcrown16}/>;
            case 20: return <img alt="crown" src={kothcrown17}/>;
            case 21: return <img alt="crown" src={kothcrown18}/>;
            case 22: return <img alt="crown" src={kothcrown19}/>;
            case 23: return <img alt="crown" src={kothcrown20}/>;
            case 24: return <img alt="crown" src={kothcrown21}/>;
            case 25: return <img alt="crown" src={kothcrown22}/>;
            case 26: return <img alt="crown" src={kothcrown23}/>;
            case 27: return <img alt="crown" src={kothcrown24}/>;
            case 28: return <img alt="crown" src={kothcrown25}/>;
            case 29: return <img alt="crown" src={kothcrown26}/>;
            case 30: return <img alt="crown" src={kothcrown27}/>;
            case 31: return <img alt="crown" src={kothcrown28}/>;
            case 32: return <img alt="crown" src={kothcrown29}/>;
            case 33: return <img alt="crown" src={kothcrown30}/>;
            case 34: return <img alt="crown" src={kothcrown31}/>;
            case 35: return <img alt="crown" src={kothcrown32}/>;
            case 36: return <img alt="crown" src={kothcrown33}/>;
            case 37: return <img alt="crown" src={kothcrown34}/>;
            case 38: return <img alt="crown" src={kothcrown35}/>;
            case 39: return <img alt="crown" src={kothcrown36}/>;
            default: return "";
        }
    };
    user_html = () => {
        return (
            <span className="name" style={{whiteSpace: 'nowrap'}}>
            <a href={server + "/gameServer/profile?viewName=" + this.name} target="_blank" rel="noopener noreferrer">
                { this.subscriber?(
                    <span style={{fontWeight:'bold', color:'#'+this.#rgb2hex(this.name_color)}}>
                        {this.name}
                    </span> ):this.name
                }
            </a> &nbsp;
                {this.#crownimage()}
        </span>
        );
    };
    rating = (game) => {
        if (game === undefined) return "";
        const r = this.game_ratings[game];
        if (r === undefined) return "";
        let gif = ratings_gray;
        if (r >= 1900) {
            gif = ratings_red;
        }
        else if (r >= 1700) {
            gif = ratings_yellow;
        }
        else if (r >= 1400) {
            gif = ratings_blue;
        }
        else if (r >= 1000) {
            gif = ratings_green;
        }
        return (
            <span><img alt="rating" src={gif}/> &nbsp; {r}</span>
        );
    };
    avatar_f = () => {
        if (this.subscriber) {
            return server+"/gameServer/avatar?name="+this.name;
        }
        return "";
    }
}

export default User;