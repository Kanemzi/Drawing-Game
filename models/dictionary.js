var db = require('../db')

exports.GetWords = function(nb,difficulty,theme,callback)
{
    var difficultyMin = (difficulty-1)*100;
    var difficultyMax = difficulty*100;
    if (difficulty == 0 && theme == 0) {
        db.query('select mot, difficulty from DICO where flag=\'ok\' Order by rand() limit ?', [nb], (result, fields) => {
            callback(result)
        })
    } else if (difficulty != 0 && theme == 0){
        db.query('select mot, difficulty from DICO where flag=\'ok\' and difficulty>=? and difficulty<=? Order by rand() limit ?;', [difficultyMin,difficultyMax,nb], (result, fields) => {
            callback(result)
        })
    } else if (difficulty == 0 && theme != 0){
        db.query('select mot, difficulty from DICO where flag=\'ok\' and theme=? Order by rand() limit ?', [theme,nb], (result, fields) => {
            callback(result)
        })
    } else if (difficulty != 0 && theme != 0){
        db.query('select mot, difficulty from DICO where flag=\'ok\' and difficulty>=? and difficulty<=? and theme=? Order by rand() limit ?; ', [difficultyMin,difficultyMax, theme,nb], (result, fields) => {
            callback(result)
        })
    }
}

exports.SetDifficulty = function(word, diff, callback)
{
    var difficulty
    var inc = 4;
    
    db.query('select difficulty from DICO where mot=?', [word], (result, fields) => {
            
            difficulty = result[0].difficulty;
            
            if(diff=='facile'){
                if(difficulty > 100){
                difficulty = difficulty - inc;
                }
                
            } else if (diff=='moyen'){
                if(difficulty > 200){
                    difficulty = difficulty - inc;
                } else if ( difficulty < 200){
                    difficulty = difficulty + inc;
                }
            } else {
                if(difficulty < 300){
                difficulty = difficulty + inc;
                }
            }
            
            if(difficulty>300){
                difficulty=300;
            }
            
            if(difficulty<100){
                difficulty=100;
            }
            
            db.query('update DICO set difficulty = ? where mot = ?', [difficulty,word], (res, fls) => {
                callback(res)
            })
        })
}

