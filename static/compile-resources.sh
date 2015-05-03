#!/bin/zsh
cd `dirname $0`
cd client-app;
find . -type d -print0 | while IFS= read -r -d $'\0' line; do
    mkdir -p ../static/"$line"
done
function compile_js {
    line=$1
    if [[ "$line" == *.js ]]; then
        browserify -t reactify -t brfs "$line" -o ../static/"$line"
        uglifyjs ../static/"$line" -o ../static/${line/.js/.min.js}
    fi
}

function compile_css {
    line=$1
    if [[ "$line" == *.css ]]; then
        rework-npm "$line" | myth > ../static/"$line"
        cleancss ../static/"$line" -o ../static/${line/.css/.min.css}
    fi
}

function copy_img {
    line=$1
    if [[ "$line" == *.jpg || "$line" == *.png ]]; then
        cp "$line" ../static/"$line";
    fi
}

find . -type f -print0 | while IFS= read -r -d $'\0' line; do
    copy_img "$line" 
    compile_js "$line"  
    compile_css "$line" 
done
terminal-notifier -title 'Forever' -message 'Resources compile completed!'
