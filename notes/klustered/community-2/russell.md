# 4th time's the charm

This is how I broke my cluster for Rawkode Academy & The Null Channel vs. The Communities.

## Control plane
The majority of the nasty stuff was here. I really wanted to slow them down before they got to the worker node.

### Mischief
- get nyancat installed as /usr/sbin/systemctl
- get cmatrix installed as /usr/sbin/journalctl
- move apt to /usr/share/fitting
- move curl to /usr/share/swirl
- move wget to /usr/share/obtain
- uninstall ed & nano
- block sleuthkit install by:
    ```s
    cat <<EOF | tee /etc/apt/preferences.d/pin-usrmerge
    Package: sleuthkit
    Pin: version *
    Pin-Priority: -1337
    EOF
		```
>note: I found that thanks to a google search and decided to keep the filename as another level of misdirection

- built a game that when completed pretends to be a shell but can only really execute rbash. Set root user's login shell to the game /bin/speakandshell
- add a "victim" account
- alter root's prompt via /etc/profile to pretend user is victim
- set profile to set `TMOUT` to 3 (turned out to be far too harsh...)
- install direnv and load it via /etc/profile
- put .envrc file in /etc/kubernetes/manifests to reset TMOUT
- used bind to swap "k" and "K" to be unicode characters instead.

### Breaks
- remove the line `- --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt` from apiserver static manifest
- limit number of pid namespaces to prevent kubernetes coming back up fully: `echo 7 > /proc/sys/user/max_pid_namespaces` (was 255194)
- add override config which will prevent kubelet from accessing /etc/kubernetes/manifests directory plus an extra config directive that would hopefully be bait. one in /etc/systemd/system/kubelet.service.d/10-kubeadm.conf, one in /lib/systemd/system/kubelet.service:
    InaccessiblePaths=-/etc/kubernetes/manifests
    TemporaryFileSystem=/etc:ro
- edit /etc/kubernetes/pki/apiserver-etcd.crt (might not be the correct name) remove one dash from header and add "Hello..." to crt body
- edit /etc/kubernetes/pki/apiserver-etcd.key (might not be the correct name) remove "RSA" from header and add "Hello..." to key body
- restart kubelet
- kill all the kube-* processes
- break vim's usual `:wq` save and exit command by putting this in ~/.vimrc (nocompatible and cabbrev, rest were there to make it look a bit legitimate if quick inspection took place)
    ```
    " Disable compatibility with vi which can cause unexpected issues.
    set nocompatible

    " Enable type file detection. Vim will be able to try to detect the type of file in use.
    filetype on

    " Enable plugins and load plugin for the detected file type.
    filetype plugin on

    " Load an indent file for the detected file type.
    filetype indent on

    " Turn syntax highlighting on.
    syntax on

    " fun stuff
    cabbrev w <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'q!' : 'q!' )<CR>
    cabbrev wq <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'q!' : 'q!' )<CR>
    cabbrev q <c-r>=(getcmdtype()==':' && getcmdpos()==1 ? 'q!' : 'q!')<CR>
    ```

### Cleanup
- run the touch all command  `find / -type f -exec touch -d "2022-04-19 17:18:27" "{}" \;`
- clear history: `history -c` and `cat /dev/null > ~/.bash_history`


## Worker
This was just a couple of breaks to get them to log into the worker node and be forced to play Wordle.

### Mischief
- set root to use a custom Wordle shell (game code courtesy of: https://github.com/64bit/wordle-rs) `/bin/wordlesh`

### Breaks
- break route to control plane: `route add -host 145.40.103.7 reject` 
- limit number of mnt namespaces (worker needed 14 to run klustered workload) - `echo 13 > /proc/sys/user/max_mnt_namespaces`
- stop and disable kubelet on worker
- create victim account and give it permissions so it could be used as backdoor, to write to /usr/share/dict/words if we needed to make wordle easier.

### Cleanup
- clear history: `history -c` & `cat /dev/null > ~/.bash_history`



## Custom shell(s)
I created 2 different binaries to act as shells and altered the root user's entry in /etc/passwd to point at my "fun" shell instead.

The following shows the concept, where game is the code for whatever you want people to play before you let them in, then the match statement allows you to pick what they can run. The following was very limited to only allowing them to run `rbash` via the bash keyword:

```rs
use std::env;
use std::io::{stdin, stdout, Write};
use std::path::Path;
use std::process::{Command, Stdio};

fn main(){
    game();
    loop {    
        println!();
        print!("root@localhost > "); // show prompt
        stdout().flush().unwrap();

        let mut input = String::new();
        stdin().read_line(&mut input).unwrap();

        // read_line leaves a trailing newline, which trim removes
        // this needs to be peekable so we can determine when we are on the last command
        let mut commands = input.trim().split(" | ").peekable();

        while let Some(command) = commands.next()  {

            // everything after the first whitespace character is interpreted as args to the command
            let mut parts = command.trim().split_whitespace();
            let user_command = parts.next().unwrap();
            let args = parts;

            match user_command {
                "cd" => {
                    // default to '/' as new directory if one was not provided
                    let new_dir = args.peekable().peek().map_or("/", |x| *x);
                    let root = Path::new(new_dir);
                    if let Err(e) = env::set_current_dir(&root) {
                        println!("{}", e);
                    }
                    //previous_command = None;
                },
                "whoami" => {
                    println!("Jackie Chan..?");
                },
                "sudo" => {
                    println!("You have no power here!");
                },
                "/bin/bash" => {
                    println!("Did you just mean bash? What's all this regex bin stuff at the start?");
                },
                "/bin/sh" => {
                    println!("bash is better.");
                },
                "exit" => return,
                "bash" => {
                    let stdin = Stdio::inherit();

                    let stdout = if commands.peek().is_some() {
                        // there is another command piped behind this one
                        // prepare to send output to the next command
                        Stdio::piped()
                    } else {
                        // there are no more commands piped behind this one
                        // send output to shell stdout
                        Stdio::inherit()
                    };

                    let output = Command::new("rbash")
                        .args(args)
                        .stdin(stdin)
                        .stdout(stdout)
                        .status();

                    match output {
                        Ok(output) => {
                            println!("{}", output);
                        },
                        Err(e) => {
                            println!("{}", e);
                        },
                    };
                },
                "help" => {
                    println!("Maybe ask chat..?");
                },
                command =>{
                    println!("ooh what's that, I've never heard of it before...");
                } 
            }
        }
    }
}
```
