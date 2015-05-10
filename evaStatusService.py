# -*- coding:gb2312 -*-
# -*- coding:UTF-8 -*-
import os

__author__ = 'jimmy'

import urllib
import urllib2
import cookielib
import re
import json
import BeautifulSoup
from pattern import web
import inspect
from dateutil.parser import parse
import difflib
import os
import sqlite3
from flask import render_template, request, session, redirect, url_for, flash, Flask
import sys

diff = difflib.Differ()
app = Flask(__name__)
db_file_path = 'cache/user_db.sqlite3'


def lineno():
    """Returns the current line number in our program."""
    return inspect.currentframe().f_back.f_lineno


def createRequest(url, body=None):
    # print body
    if body != None:
        body = urllib.urlencode(body)
    req = (urllib2.Request(url, body))
    req.add_header('User-agent',
                   'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/37.0.2062.120 Chrome/37.0.2062.120 Safari/537.36')
    return req


def get_tables(html):
    """Parse html and return html tables of wikipedia population data."""

    dom = web.Element(html)

    # ## 0. step: look at html source!
    # ### 1. step: get all tables
    # tbls = dom('table')
    # ### 2. step: get all tables we care about
    tbls = dom.by_class('collapse1')
    # href = tbls.by_class('thumbnail')
    return tbls


def getinfo(x, httpClient):
    fishProfileRequest = createRequest('https://ms.tcgm.tw/FishBox/manage_display/show_fishStudyInfo/', {'fish_id': x})
    fishProfileResponse = httpClient.open(fishProfileRequest)
    fishProfileResponseString = fishProfileResponse.read()
    profilesoup = BeautifulSoup.BeautifulSoup(fishProfileResponseString)

    # div = profilesoup.findAll("div" , {'class' : 'span3 lightblue'})
    div = profilesoup.findAll('label')
    # print div
    str = div[1].text.encode('unicode-escape')
    list = str.split(":")
    if list[1].decode('unicode-escape') == u'\u7537':
        gender = True
    else:
        gender = False

    str = div[2].text.encode('unicode-escape')
    list = str.split(":")
    church = list[1].decode('unicode-escape')
    # print church

    str = div[3].text.encode('unicode-escape')
    list = str.split(":")
    depart = list[1].decode('unicode-escape')
    # print depart

    tag = profilesoup.findAll('h3')
    name = tag[0].text
    # print name
    order = 0
    if depart == u'\u570b\u9ad8\u4e2d\u90e8' and gender == True:
        order = 1
    elif depart == u'\u570b\u9ad8\u4e2d\u90e8' and gender == False:
        order = 2
    elif depart == u'\u5927\u5b78\u90e8' and gender == True:
        order = 3
    elif depart == u'\u5927\u5b78\u90e8' and gender == False:
        order = 4
    elif depart == u'\u9752\u5e74\u90e8' and gender == True:
        order = 5
    elif depart == u'\u9752\u5e74\u90e8' and gender == False:
        order = 6
    elif depart == u' \u9577\u5e74\u90e8' and gender == True:
        order = 7
    elif depart == u' \u9577\u5e74\u90e8' and gender == False:
        order = 8

    array = []
    for td_tag in profilesoup.findAll('td'):
        array.append(td_tag.text)

    lecture = []
    date = []
    lecturer = []
    condition = []
    leclist = []
    i = 0
    j = 0
    while i < len(array):
        if j == 0:
            if array[i] == u'\u8056\u7d93\u6642\u89c0':
                j = 1
            else:
                i = i + 1

        if j == 1:
            if array[i] == u'\u5176\u4ed6':
                i = len(array)
                break
            if array[i + 1] == u'':
                lecture.append(array[i])
                date.append(u'0')
                lecturer.append(u'0')
                condition.append(u'0')
                i = i + 2
            else:
                lecture.append(array[i])
                a = array[i + 1].decode('unicode-escape').replace("-0", "/").replace("-", "/")
                a = a + 'T08'
                try:
                    a = int(parse(a).strftime('%s'))
                except:
                    a = 0
                # print(a)
                date.append(a)
                lecturer.append(array[i + 2])
                condition.append(array[i + 3])
                leclist.append([array[i], a, array[i + 2]])
                i = i + 5

    result = {"name": name, "gender": gender, "depart": depart, "order": order, "lessons": leclist, "church": church}
    # print result
    return result


def do_login(username, password, http_client):
    loginPost = 'https://ms.tcgm.tw/welcome/login'
    loginParameterMap = {'account': username,
                         'pwd': password}
    loginPostRequest = createRequest(loginPost, loginParameterMap)
    loginPostResponse = http_client.open(loginPostRequest)
    loginPostResponseString = loginPostResponse.read()
    if 'login' not in loginPostResponseString:
        return str(True)
    else:
        return str(False)


def get_all_herders_with_password():
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('SELECT username, password FROM users WHERE is_herder = ?',(1,))
    records = cursor.fetchall()
    result = []
    for record in records:
        result.append({'username': record[0], 'password': record[1]})
    cursor.close()
    conn.close()
    return result

@app.route("/get_all_herders")
def get_all_herders():
    if not os.path.exists(db_file_path):
        init_db()
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('SELECT username FROM users WHERE is_herder = ?', (1,))
    herders = [record[0] for record in cursor.fetchall()]
    cursor.close()
    conn.close()
    return json.dumps(herders)

@app.route("/load_all_eva_status")
def load_all_eva_status():
    all_herders = get_all_herders_with_password()
    for herder in all_herders:
        load_eva_status(herder['username'], herder['password'])
    return str(True)


@app.route("/load_eva_status")
def load_eva_status(username, password):
    print 'start loading %s evaStatus' % username
    cookie_store = cookielib.CookieJar()
    http_client = urllib2.build_opener(urllib2.HTTPCookieProcessor(cookie_store))
    do_login(username, password, http_client)

    print('Logged in!')
    fishListPageRequest = createRequest('http://ms.tcgm.tw/FishBox/manage_display/show_fishList')
    fishListPageResponse = http_client.open(fishListPageRequest)
    fishPageResponseString = fishListPageResponse.read()
    print('List got')

    soup = BeautifulSoup.BeautifulSoup(fishPageResponseString)
    learninglist = soup.find(id='collapse1')
    href = learninglist.findAll('a', attrs={'href': re.compile("^javascript:formSubmit")})
    print('List content parsed!')

    regex = re.compile("formSubmit\(([0-9]+)\)")

    fishMap = []

    for line in href:
        matches = regex.search(line.__repr__())
        if matches is not None:
            fishMap.append(matches.group(1))

    getfishinfo = []

    for i in fishMap:
        a = getinfo(i, http_client)
        getfishinfo.append(a)

    fish_list = json.dumps(getfishinfo)

    if not os.path.exists('cache/' + username):
        os.makedirs('cache/' + username)

    with open('cache/' + username + '/data.json', "w") as fish_list_cache_file:
        fish_list_cache_file.write(fish_list)

    return 'success'


def init_db():
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE users (username TEXT, password TEXT, is_herder TINYINT)')
    conn.commit()
    cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS unique_username ON users (username)')
    conn.commit()
    conn.close()

def add_user(username, is_herder):
    if not os.path.exists(db_file_path):
        init_db()
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO users (username, is_herder) VALUES (?, ?)', (username, int(is_herder)))
    # print 'affectedRows: %d' % cursor.rowcount
    if cursor.rowcount == 1:
        print 'Sucessfully add user %s' % username
    cursor.close()
    conn.commit()
    conn.close()

def remove_user(username):
    if not os.path.exists(db_file_path):
        init_db()
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM users WHERE username = ?', (username,))
    print 'affectedRows: %d ' % cursor.rowcount
    if cursor.rowcount == 1:
        print 'Sucessfully remove user %s' % username
    cursor.close()
    conn.commit()
    conn.close()

def set_herder(username):
    if not os.path.exists(db_file_path):
        init_db()
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET is_herder = ? WHERE username = ?', (1,username))
    print 'affectedRows: %d' % cursor.rowcount    
    if cursor.rowcount == 1:
        print 'Successfully set %s as a herder.' % username
    cursor.close()
    conn.commit()
    conn.close()
    

def unset_herder(username):
    if not os.path.exists(db_file_path):
        init_db()
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET is_herder = ? WHERE username = ?', (0,username))    
    print 'affectedRows: %d' % cursor.rowcount
    cursor.close()
    conn.commit()
    conn.close()
    print 'Successfully unset %s from a herder.' % username

def get_password(username):
    if not os.path.exists(db_file_path):
        init_db()
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('SELECT password FROM users WHERE username = ?', (username,))
    password = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return password


def insert_or_update_user(username, password):
    if not os.path.exists(db_file_path):
        init_db()
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    if cursor.fetchone():
        print 'user exists'
        cursor.execute('UPDATE users SET password = ? WHERE username = ? ', (password, username))
    else:
        print 'user does not exist'
        cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, password)) 
    cursor.close()
    conn.commit()
    conn.close()


@app.route("/get_eva_status")
def get_eva_status():
    username = request.args['username']
    fish_list = ''
    cache_file_path = 'cache/' + username + '/data.json'
    print cache_file_path
    if not os.path.exists(cache_file_path):
        password = get_password(username)
        load_eva_status(username, password)
    with open(cache_file_path, "r") as fish_list_cache_file:
        fish_list = fish_list_cache_file.read()
    return fish_list


@app.route("/eva_status/index.html")
def show_eva_status():
    if session['username']:
        return render_template('eva_status/index.html', username=session['username'])
    else:
        return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        cookie_store = cookielib.CookieJar()
        http_client = urllib2.build_opener(urllib2.HTTPCookieProcessor(cookie_store))
        is_login_success = do_login(username, password, http_client)
        if is_login_success:
            session['username'] = username
            insert_or_update_user(username, password)
            return redirect(url_for('show_eva_status'))
        else:
            error = 'Invalid username or password'
    return render_template('users/login.html', error=error)


@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))


app.secret_key = 'A0Zr98j/3yX R~XHH!jmN]LWX/,?RT'

from tornado.wsgi import WSGIContainer
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop

cmd = sys.argv[1]


def destroy_db():
    os.remove(db_file_path)

if cmd == 'start':
    pid = os.getpid()
    print "Running server at process " + str(pid)
    http_server = HTTPServer(WSGIContainer(app))
    http_server.listen(5000)
    IOLoop.instance().start()
elif cmd == 'load':
    load_all_eva_status()
elif cmd == 'reset_db':
    destroy_db()
    init_db()
elif cmd == 'set_herder':
    username = sys.argv[2]
    set_herder(username)
elif cmd == 'unset_herder':
    username = sys.argv[2]
    unset_herder(username)
elif cmd == 'add_user':
    username = sys.argv[2]
    is_herder = sys.argv[3]
    add_user(username, is_herder)
elif cmd == 'remove_user':
    username = sys.argv[2]
    remove_user(username)